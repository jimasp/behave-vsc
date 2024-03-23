import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { performance } from 'perf_hooks';
import { services } from "./services";
import { Scenario, TestData } from '../parsers/testFile';
import { ProjectSettings, StepImport } from '../config/settings';
import { xRayLog } from './logger';



const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };

export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952
export const WIN_MAX_CMD = 8191; // 8192 - 1, see https://docs.microsoft.com/en-us/windows/win32/procthread/command-line-limitation
export const THIN_SPACE = "\u200A"; // hair space
export const HAIR_SPACE = "\u2009"; // thin space

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


export const getProjectUris = (() => {
  let projectUris: vscode.Uri[] = [];

  // get projects, i.e. workspace folders that contain .feature files  
  return async (forceRefresh = false): Promise<vscode.Uri[]> => {
    const start = performance.now();

    // NOTE: NOTHING THAT THIS FUNCTION CALLS CAN USE THE LOGGER, AS IT MAY NOT BE AVAILABLE YET

    // this function reads the file system (i.e. slow-ish)
    // so we'll default to returning a cached result unless forceRefresh is true
    if (projectUris.length > 0 && !forceRefresh)
      return projectUris;
    projectUris = [];

    const folders = vscode.workspace.workspaceFolders;
    if (!folders)
      throw new Error("No workspace folders found");

    if (folders.length === 1 && folders[0].name === "behave-vsc")
      throw new Error(`Please disable the marketplace Behave VSC extension before beginning extension debugging!`);

    for (const folder of folders) {
      const start2 = performance.now();
      const excludedPathPatterns = getExcludedPathPatterns(folder.uri);
      if (await folderContainsAFeatureFile(excludedPathPatterns, folder.uri))
        projectUris.push(folder.uri);
      xRayLog(`PERF: folderContainsAFeatureFileSync took ${performance.now() - start2} ms for ${folder.uri.fsPath}`);
    }

    xRayLog(`PERF: getProjectUris took ${performance.now() - start} ms, projects: ${projectUris.length}`);

    return projectUris;
  }
})();


export const getValidProjectUris = async (projectUris: vscode.Uri[]): Promise<vscode.Uri[]> => {
  const start = performance.now();
  const validProjectUris: vscode.Uri[] = [];
  for (const projUri of projectUris) {
    const ps = await services.config.getProjectSettings(projUri);
    if (ps.isValid)
      validProjectUris.push(projUri);
  }
  xRayLog(`PERF: getValidProjectUris took ${performance.now() - start} ms, projects: ${projectUris.length}`);
  return validProjectUris;
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
  return await services.config.getProjectSettings(projUri);
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
  const data = await fs.promises.readFile(uri.fsPath);
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

  // function to get the matching steps library dictionary entry for the given relative path
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

  if (fileUri.scheme !== "file")
    return false;

  const lcPath = fileUri.path.toLowerCase();
  if (!lcPath.endsWith(".py"))
    return false;

  // as per behave, ignore .py files that are not in in known steps folder locations
  const ps = await getProjectSettingsForFile(fileUri);

  // if the file path is not within any of the projRelativeStepsFolders then it's not a steps file
  if (!ps.projRelativeStepsFolders.some(relPath => fileUri.path.startsWith(`${ps.uri.path}/${relPath}/`)))
    return false;

  // standard "/steps/" folder match
  if (/.*\/steps\/.*/.test(lcPath))
    return true;

  // if the file path does is not contain "/steps/" and we got this far, 
  // then this must be a steps library folder,
  // (steps library folders are always included in projRelativeStepsFolders)
  const projSettings = await getProjectSettingsForFile(fileUri);
  const relPath = path.relative(projSettings.uri.fsPath, fileUri.fsPath);
  const stepLibMatch = getStepLibraryMatch(projSettings, relPath);

  // check if it matches the regex
  if (!stepLibMatch || !new RegExp(stepLibMatch.stepFilesRx).test(relPath))
    return false;

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


export async function folderContainsAFeatureFile(excludedPathPatterns: ExcludedPatterns, uri: vscode.Uri): Promise<boolean> {

  if (excludedPathPatterns && isExcludedPath(excludedPathPatterns, uri.fsPath))
    return false;

  const entries = await fs.promises.readdir(uri.fsPath);
  for (const entry of entries) {
    if (entry.endsWith(".feature"))
      return true;
    const stat = fs.statSync(path.join(uri.fsPath, entry));
    if (stat.isDirectory() && await folderContainsAFeatureFile(excludedPathPatterns, vscode.Uri.file(path.join(uri.fsPath, entry))))
      return true;
  }
  return false;
}


export async function findFeatureFolders(ps: ProjectSettings, absolutePath: string):
  Promise<string[]> {

  // THIS IS CALLED TO SEARCH FOR FEATURE FOLDERS ONLY WHEN THERE ARE NO BEHAVE CONFIG PATHS SET 
  // (note that behave will ignore the root of the working dir when no config paths is set, so we will do the same)

  // find feature folders, perform an early exit where possible, 
  // i.e. if path a/1 has a feature file, we don't need to check child paths a/1/1 or a/1/2 (but we do need to check a/2)

  const start = performance.now();
  const entries = await fs.promises.readdir(absolutePath);
  const childFolders: string[] = [];
  const results: string[] = [];

  if (isExcludedPath(ps.excludedPathPatterns, absolutePath)) {
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
        if (absolutePath === ps.behaveWorkingDirUri.fsPath)
          continue;
        results.push(absolutePath);
        return results;
      }
    }
  }

  // no matched files in directory, so second pass: navigate down to child directories and see if they have a feature file
  for (const absFolderPath of childFolders) {
    const subDirResults = await findFeatureFolders(ps, absFolderPath);
    results.push(...subDirResults);
  }

  const end = performance.now() - start;
  xRayLog(`PERF: findFeatureFolders(${absolutePath}) took ${end}ms`, ps.uri);

  return results;
}


export function isExcludedPath(excludedPaths: ExcludedPatterns, path: string): boolean {
  for (const pattern of Object.keys(excludedPaths)) {
    if (excludedPaths[pattern] && minimatch(path, pattern))
      return true;
  }
  return false;
}

export type ExcludedPatterns = { [key: string]: boolean; };

export function getExcludedPathPatterns(projUri: vscode.Uri): ExcludedPatterns {

  const projConfig = vscode.workspace.getConfiguration(undefined, projUri);

  const excludePatterns: ExcludedPatterns = {
    // these first 3 have BOTH defaults provided by vscode AND the user's own settings.json exclusions
    ...projConfig.get<ExcludedPatterns>('files.exclude'),
    ...projConfig.get<ExcludedPatterns>('files.watcherExclude'),
    ...projConfig.get<ExcludedPatterns>('search.exclude'),
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules/**": true,
    "**/bower_components": true,
    "**/__pycache__": true,
    "**/.*_cache": true,
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

  xRayLog(`excludePatterns for ${projUri}:\n${JSON.stringify(excludePatterns, null, 2)}`);
  return excludePatterns;
}


export function getOptimisedFeatureParsingPaths(relativePaths: string[]): string[] {
  /* 
  get the smallest set of longest paths that contain all feature folder paths,
  i.e. return the most efficient paths to be used as the search paths for parsing feature files
    
  See unit tests for examples, but for a quick example here, given this structure:

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
          ├── a.feature 
          └── b.feature  
      └── features3
          └── a.feature           

  and assuming no behave.ini file paths, then we would be called with all folder paths containing the feature files, i.e.:
  [
    "",
    "tests/features",
    "tests/features/web"
    "tests/features2",
    "tests/features3",
  ]

  and this function should return:
    [
      "",  <-- project root (special case)
      "tests/features",  <-- longest common path containing both "tests/features" and "tests/features/web"
      "tests/features2"  <-- other path containing features
      "tests/features3"  <-- other path containing features
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

export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path);
    return true;
  }
  catch {
    return false;
  }
}

export function pathExistsSync(pattern: string): boolean {
  return fs.existsSync(pattern);
}

export function showDebugWindow() {
  vscode.commands.executeCommand("workbench.debug.action.toggleRepl");
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

export function isIterable(obj: unknown): boolean {
  return obj != null && typeof (obj as Iterable<unknown>)[Symbol.iterator] === 'function';
}

export function getTimeString() {
  return new Date().toISOString().replace(/:/g, "-");
}