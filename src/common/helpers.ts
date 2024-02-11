import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { performance } from 'perf_hooks';
import { customAlphabet } from 'nanoid';
import { services } from "./services";
import { Scenario, TestData } from '../parsers/testFile';
import { ProjectSettings, StepImport } from '../config/settings';
import { xRayLog } from './logger';
import { getJunitDirUri } from '../watchers/junitWatcher';



const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };

export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952
export const WIN_MAX_CMD = 8191; // 8192 - 1, see https://docs.microsoft.com/en-us/windows/win32/procthread/command-line-limitation


export const sepr = ":////:"; // separator that cannot exist in file paths, i.e. safe for splitting in a path context
export const beforeFirstSepr = (str: string) => str.substring(0, str.indexOf(sepr));
export const afterFirstSepr = (str: string) => str.substring(str.indexOf(sepr) + sepr.length, str.length);


// projError is a wrapper that enables us to have an error containing a project uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the logger can log to the specific project-named output window (for multi-root workspaces)
// - the logger can use the project name in the notification window
// - the top-level catch can simply call `services.logger.showError(e)` and Logger will handle the rest
// - the error is only logged/displayed once
// for more info on error handling, see contributing.md
export class projError extends Error {
  constructor(errorOrMsg: unknown, public projUri: vscode.Uri, public run?: vscode.TestRun) {
    const msg = errorOrMsg instanceof Error ? errorOrMsg.message : errorOrMsg as string;
    super(msg);
    this.stack = errorOrMsg instanceof Error ? errorOrMsg.stack : undefined;
    Object.setPrototypeOf(this, projError.prototype);
  }
}


export const openDocumentRange = async (uri: vscode.Uri, range: vscode.Range, preserveFocus = true, preview = false) => {

  // fix for: "git reverted file no longer opens in read-only mode when go to step definition is clicked":
  // uri does not behave the same as vscode.Uri.file(uri.path)
  // e.g. in the first case, if the user discards (reverts) a git file change the file would open as readonly
  const openUri = vscode.Uri.file(uri.path);

  await vscode.commands.executeCommand('vscode.open', openUri, {
    selection: new vscode.Selection(range.start, range.end), preserveFocus: preserveFocus, preview: preview
  });
}


export const logExtensionVersion = (context: vscode.ExtensionContext): void => {
  const extensionVersion = context.extension.packageJSON.version;
  const releaseNotesUrl = `${context.extension.packageJSON.repository.url.replace(".git", "")}/releases/tag/v${extensionVersion}`;
  const outputVersion = extensionVersion.startsWith("0") ? extensionVersion + " pre-release" : extensionVersion;
  services.logger.logInfoAllProjects(`Behave VSC v${outputVersion}`);
  services.logger.logInfoAllProjects(`Release notes: ${releaseNotesUrl}\n`);
}


// these two uri functions are here to highlight why uri.toString() is needed:
// 1. uri.path and uri.fsPath BOTH give inconsistent casing of the drive letter on windows ("C:" vs "c:") 
// whether uri1.path === uri2.path or uri1.fsPath === uri2.fsPath depends on whether both uris are being set/read on
// a similar code stack (i.e. whether both used "C" or "c" when the value was set).
// at any rate, we can use toString() to provide consistent casing for matching one uri path or fsPath to another.
// 2. separately, two uris that point to the same path (regardless of casing) may not be the same object, so uri1 === uri2 would fail
// so whenever we plan to use a uri in an equals comparison we should use one of these functions
export function uriId(uri: vscode.Uri) {
  return uri.toString();
}
export function urisMatch(uri1: vscode.Uri, uri2: vscode.Uri) {
  return uri1.toString() === uri2.toString();
}

export function uriStartsWith(uriToCheck: vscode.Uri, checkIfStartsWithUri: vscode.Uri) {
  return uriToCheck.toString().startsWith(checkIfStartsWithUri.toString());
}

export async function cleanExtensionTempDirectory(cancelToken: vscode.CancellationToken) {

  const dirUri = services.config.extensionTempFilesUri;
  const junitDirUri = getJunitDirUri();

  // note - this function runs asynchronously, and we do not wait for it to complete before we start 
  // the junitWatcher, this is why we don't want to delete the (watched) junit directory itself (only its contents)

  try {
    const children = await vwfs.readDirectory(dirUri);

    for (const [name,] of children) {
      if (!cancelToken.isCancellationRequested) {
        const curUri = vscode.Uri.joinPath(dirUri, name);
        if (urisMatch(curUri, junitDirUri)) {
          const jChildren = await vwfs.readDirectory(curUri);
          for (const [jName,] of jChildren) {
            await vwfs.delete(vscode.Uri.joinPath(curUri, jName), { recursive: true, useTrash: true });
          }
          continue;
        }
        await vwfs.delete(curUri, { recursive: true, useTrash: true });
      }
    }
  }
  catch (e: unknown) {
    // we will get here if (a) the folder doesn't exist, or (b) the user has the folder open, e.g. in windows explorer
  }
}



// get the actual value in the settings.json file or return undefined, this is
// for cases where we need to distinguish between an unset value and the default value
export const getActualWorkspaceSetting = <T>(wkspConfig: vscode.WorkspaceConfiguration, name: string): T => {
  const value = wkspConfig.inspect(name)?.workspaceFolderValue;
  return (value as T);
}

export const normaliseUserSuppliedRelativePath = (path: string) => {
  return path.trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

let workspaceFoldersWithFeatures: vscode.Uri[];
export const getUrisOfWkspFoldersWithFeatures = (forceRefresh = false): vscode.Uri[] => {

  // NOTE: THIS FUNCTION MUST BE FAST (IDEALLY < 1MS) 
  // so we'll default to returning a cached result
  if (!forceRefresh && workspaceFoldersWithFeatures)
    return workspaceFoldersWithFeatures;

  const start = performance.now();
  workspaceFoldersWithFeatures = [];

  const folders = vscode.workspace.workspaceFolders;
  if (!folders)
    throw "No workspace folders found";

  if (folders.length === 1 && folders[0].name === "behave-vsc")
    throw `Please disable the marketplace Behave VSC extension before beginning extension debugging!`;

  for (const folder of folders) {
    if (projectContainsAFeatureFileSync(folder.uri))
      workspaceFoldersWithFeatures.push(folder.uri);
  }

  xRayLog(`PERF: getUrisOfWkspFoldersWithFeatures took ${performance.now() - start} ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

  return workspaceFoldersWithFeatures;
}


export const getProjectUriForFile = (fileorFolderUri: vscode.Uri | undefined): vscode.Uri => {
  if (fileorFolderUri?.scheme !== "file")
    throw new Error(`Unexpected scheme: ${fileorFolderUri?.scheme}`);
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const projUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!projUri)
    throw "No workspace folder found for file " + fileorFolderUri.fsPath;
  return projUri;
}


export const getProjectSettingsForFile = async (fileorFolderUri: vscode.Uri | undefined): Promise<ProjectSettings> => {
  const projUri = getProjectUriForFile(fileorFolderUri);
  return await services.config.getProjectSettings(projUri.path);
}


export const getWorkspaceFolder = (wskpUri: vscode.Uri): vscode.WorkspaceFolder => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(wskpUri);
  if (!workspaceFolder)
    throw new Error("No workspace folder found for uri " + wskpUri.path);
  return workspaceFolder;
}


export const getContentFromFilesystem = async (uri: vscode.Uri | undefined): Promise<string> => {
  if (!uri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const data = await vwfs.readFile(uri);
  return Buffer.from(data).toString('utf8');
};


export const isFeatureFile = async (fileUri: vscode.Uri): Promise<boolean> => {

  if (fileUri.scheme !== "file")
    return false;

  const lcPath = fileUri.path.toLowerCase();
  if (!lcPath.endsWith(".feature"))
    return false;

  // as per behave, ignore feature files that are not in in known feature folder locations
  const ps = await getProjectSettingsForFile(fileUri);
  if (!ps.projRelativeFeatureFolders.some(relPath => fileUri.path.startsWith(`${ps.uri.path}/${relPath}`)))
    return false;

  return true;
}


export const isStepsFile = async (fileUri: vscode.Uri): Promise<boolean> => {

  if (fileUri.scheme !== "file")
    return false;

  const lcPath = fileUri.path.toLowerCase();
  if (!lcPath.endsWith(".py"))
    return false;

  // as per behave, ignore .py files that are not in in known steps folder locations
  const ps = await getProjectSettingsForFile(fileUri);
  if (!ps.projRelativeStepsFolders.some(relPath => fileUri.path.startsWith(`${ps.uri.path}/${relPath}`)))
    return false;

  // check if the path matches a step library setting path AND regex string
  const getStepLibraryMatch = (ps: ProjectSettings, relPath: string) => {
    let stepLibMatch: StepImport | null = null;
    let currentMatchLen = 0, lenPath = 0;
    for (const stepLib of ps.importedSteps) {
      if (relPath.startsWith(stepLib.relativePath))
        lenPath = stepLib.relativePath.length;
      if (lenPath > currentMatchLen) {
        currentMatchLen = lenPath;
        stepLibMatch = stepLib;
      }
    }
    return stepLibMatch;
  }

  if (!/.*\/steps\/.*/.test(lcPath)) {
    const projSettings = await getProjectSettingsForFile(fileUri);
    const relPath = path.relative(projSettings.uri.fsPath, fileUri.fsPath);
    const stepLibMatch = getStepLibraryMatch(projSettings, relPath);
    if (!stepLibMatch || !new RegExp(stepLibMatch.stepFilesRx).test(relPath))
      return false;
  }

  return true;
}

export const getFeaturesFolderUriForFeatureFileUri = (ps: ProjectSettings, featureFileUri: vscode.Uri) => {
  for (const relFeaturesPath of ps.projRelativeFeatureFolders) {
    const featuresFolderUri = vscode.Uri.joinPath(ps.uri, relFeaturesPath);
    if (featureFileUri.fsPath.startsWith(featuresFolderUri.fsPath + path.sep))
      return featuresFolderUri;
  }
}


export const deleteTestTreeNodes = (projId: string | null, testData: TestData, ctrl: vscode.TestController) => {
  const items = getTestItems(projId, ctrl.items);
  for (const item of items) {
    ctrl.items.delete(item.id);
    testData.delete(item);
  }
}


export const getTestItems = (projId: string | null, testItems: vscode.TestItemCollection): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];

  // get all test items if projUri is null, or
  // just the ones in the current project if projUri is supplied 
  testItems.forEach(item => {
    if (projId === null || item.id.startsWith(projId)) {
      items.push(item);
      if (item.children)
        items.push(...getTestItems(projId, item.children));
    }
  });

  return items;
}


export const countTestItemsInCollection = (projId: string | null, testData: TestData, items: vscode.TestItemCollection): TestCounts => {
  const arr = getTestItems(projId, items);
  return countTestItems(testData, arr);
}


export const getScenarioTests = (testData: TestData, items: vscode.TestItem[]): vscode.TestItem[] => {
  const scenarios = items.filter(item => {
    const data = testData.get(item);
    if (data && (data as Scenario).scenarioName)
      return true;
  });
  return scenarios;
}


export const countTestItems = (testData: TestData, items: vscode.TestItem[]): TestCounts => {
  const testCount = getScenarioTests(testData, items).length;
  const nodeCount = items.length;
  return { nodeCount, testCount };
}


export function cleanBehaveText(text: string) {
  return text.replaceAll("\x1b", "").replaceAll("[33m", "").replaceAll("[0m", "");
}


// cancellable custom function to replace vscode.workspace.findFiles() functionality when required
// due to the glob INTERMITTENTLY not returning results on vscode startup in Windows OS for multiroot workspaces
export async function findFiles(directory: vscode.Uri, match: RegExp, recursive: boolean,
  cancelToken?: vscode.CancellationToken | undefined): Promise<vscode.Uri[]> {

  const entries = await vwfs.readDirectory(directory);
  const results: vscode.Uri[] = [];

  for (const entry of entries) {
    if (cancelToken && cancelToken.isCancellationRequested)
      return results;
    const fileName = entry[0];
    const fileType = entry[1];
    const entryUri = vscode.Uri.joinPath(directory, fileName);
    if (recursive && fileType === vscode.FileType.Directory) {
      results.push(...await findFiles(entryUri, match, recursive, cancelToken));
      continue;
    }
    if (match.test(entryUri.path))
      results.push(entryUri);
  }

  return results;
}


export function projectContainsAFeatureFileSync(uri: vscode.Uri): boolean {
  // early exit sync function
  const entries = fs.readdirSync(uri.fsPath);
  for (const entry of entries) {
    if (entry.endsWith(".feature"))
      return true;
    const stat = fs.statSync(path.join(uri.fsPath, entry));
    if (stat.isDirectory() && projectContainsAFeatureFileSync(vscode.Uri.file(path.join(uri.fsPath, entry))))
      return true;
  }
  return false;
}



export async function findFeatureFolders(stopOnFirstMatch: boolean, ps: ProjectSettings, absolutePath: string):
  Promise<string[]> {

  // THIS IS CALLED TO SEARCH FOR FEATURE FOLDERS ONLY WHEN THERE ARE NO BEHAVE CONFIG PATHS SET 
  // (or behave config paths is set to "." or "")

  // find feature folders, perform an early exit where possible:
  // immediately return on first path if stopOnFirstMatch is true, or
  // if path a/1 has a feature file, we don't need to check child paths a/1/1 or a/1/2 (but we do need to check a/2)

  const start = performance.now();
  const entries = await fs.promises.readdir(absolutePath);
  const childFolders: string[] = [];
  const results: string[] = [];

  if (isExcludedPath(ps, absolutePath)) {
    xRayLog(`findFeatureFolders: ignoring excluded path "${absolutePath}"`, ps.uri);
    return [];
  }

  // first pass = files only
  for (const entry of entries) {
    const entryPath = path.join(absolutePath, entry);
    const stat = await fs.promises.stat(entryPath);
    if (stat.isDirectory()) {
      childFolders.push(entryPath);
    }
    else {
      if (entry.endsWith(".feature")) {
        results.push(absolutePath);
        // if it's the project root, keep going and find subfolers
        if (stopOnFirstMatch || absolutePath !== ps.uri.path)
          return results;
      }
    }
  }

  // no matched files in directory, so second pass: navigate down to child directories and see if they have a feature file
  for (const absFolderPath of childFolders) {
    const subDirResults = await findFeatureFolders(stopOnFirstMatch, ps, absFolderPath);
    results.push(...subDirResults);
  }

  const end = performance.now() - start;
  xRayLog(`PERF: findFeatureFolders(${absolutePath}) took ${end}ms`, ps.uri);

  return results;
}



export function isExcludedPath(ps: ProjectSettings, wsRelPath: string): boolean {
  for (const pattern of Object.keys(ps.excludedPathPatterns)) {
    if (ps.excludedPathPatterns[pattern] && minimatch(wsRelPath, pattern))
      return true;
  }
  return false;
}


export function getExcludedPathPatterns(projConfig: vscode.WorkspaceConfiguration): { [key: string]: boolean; } {

  const excludePatterns: { [key: string]: boolean } = {
    ...projConfig.get<object>('files.exclude'),
    ...projConfig.get<object>('files.watcherExclude'),
    ...projConfig.get<object>('search.exclude'),
    "**/.*_cache": true,
    "**/node_modules": true,
    "**/.venv": true,
    "**/__venv__": true,
    "**/env": true,
    "**/__env__": true,
    "**/.env": true,
    "**/__.env__": true,
    "**/.vscode": true,
  };

  // append {,/**}' to each pattern so we also match child files and folders
  for (const pattern of Object.keys(excludePatterns)) {
    if (excludePatterns[pattern] && !pattern.endsWith("{,/**}"))
      excludePatterns[pattern + "{,/**}"] = true;
  }

  return excludePatterns;
}


export function getOptimisedFeatureParsingPaths(relativePaths: string[]): string[] {
  /* 
  get the smallest set of longest paths that contain all feature folder paths
  these will be used as the search paths for parsing feature files
  (see unit tests for examples)  

  e.g. for this structure:

  my_project
  ├── my.feature
  └── tests
      ├── pytest
      │    └── unittest.py    
      ├── features
      │   ├── a.feature
      │   └── web
      │       └── a.feature
      └── features2
          └── a.feature 

  we would be passed in all folder paths containing the feature files, i.e.:
  [
    "",
    "tests/features",
    "tests/features/web"
    "tests/features2",
  ]

  and we will return:
    [
      "", 
      "tests/features",  
      "tests/features2"   
    ]

  (note that the project-root "" is a special case (non-recursive) in _parseFeatureFiles in fileParser.ts)
  */
  const splitPaths = relativePaths.map(path => path.split('/')).sort((a, b) => a.length - b.length);
  const shortPaths: string[][] = [];
  for (const path of splitPaths) {
    if (!shortPaths.some(sp => (path.join("/") + "/").startsWith(sp.join('/') + "/")))
      shortPaths.push(path);
  }
  return shortPaths.map(result => result.join('/')).sort((a, b) => a.localeCompare(b));
}


export function getFeatureNodePath(uri: vscode.Uri, ps: ProjectSettings) {
  let stripPath: string | undefined = undefined;

  let nodePath = uri.path.substring(ps.uri.path.length + 1);

  const projRelativeFeatureFolders = ps.projRelativeFeatureFolders;

  if (projRelativeFeatureFolders.length > 1) {
    const topProjectNodes = [...new Set(projRelativeFeatureFolders.map(f => f.split("/")[0]))];
    if (topProjectNodes.length === 1)
      stripPath = ps.uri.path + "/" + topProjectNodes[0];
  }
  else {
    stripPath = getFeaturesFolderUriForFeatureFileUri(ps, uri)?.path;
  }

  if (stripPath)
    nodePath = uri.path.substring(stripPath.length + 1);
  return nodePath;
}

export async function fileExists(pattern: string): Promise<boolean> {
  const files = await glob(pattern, {});
  return files.length > 0;
}

export function showDebugWindow() {
  vscode.commands.executeCommand("workbench.debug.action.toggleRepl");
}


export function rndAlphaNumeric(size = 5) {
  return customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")(size);
}


export function rndNumeric(size = 6) {
  return customAlphabet("0123456789")(size);
}


export function basename(uri: vscode.Uri) {
  const basename = uri.path.split("/").pop();
  if (!basename)
    throw "could not determine file name from uri";
  return basename;
}


export function getLines(text: string) {
  return text.split(/\r\n|\r|\n/);
}
