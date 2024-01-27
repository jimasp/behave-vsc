import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { customAlphabet } from 'nanoid';
import { services } from "../services";
import { Scenario, TestData } from '../parsers/testFile';
import { StepImport, ProjectSettings } from '../config/settings';
import { xRayLog } from './logger';
import { getJunitDirUri } from '../watchers/junitWatcher';

const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };

export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952
export const WIN_MAX_CMD = 8191; // 8192 - 1, see https://docs.microsoft.com/en-us/windows/win32/procthread/command-line-limitation
export const BEHAVE_CONFIG_FILES_PRECEDENCE = ["behave.ini", ".behaverc", "setup.cfg", "tox.ini", "pyproject.toml"];


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
// this can be useful for e.g. handling deprecated settings
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

  // NOTE: this function must be fast (ideally < 1ms) 
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
    const featureFiles = findFilesSync(folder.uri, undefined, ".feature", true);
    if (featureFiles.length === 1)
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


export const getProjectSettingsForFile = (fileorFolderUri: vscode.Uri | undefined): ProjectSettings => {
  const projUri = getProjectUriForFile(fileorFolderUri);
  return services.config.projectSettings[projUri.path];
}


export const getWorkspaceFolder = (wskpUri: vscode.Uri): vscode.WorkspaceFolder => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(wskpUri);
  if (!workspaceFolder)
    throw new Error("No workspace folder found for uri " + wskpUri.path);
  return workspaceFolder;
}


export const getStepsDir = (baseDirFsPath: string): string | null => {

  const list = fs.readdirSync(baseDirFsPath);
  for (const fileOrDir of list) {
    if (fileOrDir !== "steps")
      continue;
    const filePath = path.join(baseDirFsPath, fileOrDir);
    if (fs.statSync(filePath).isDirectory()) {
      const relPath = vscode.workspace.asRelativePath(filePath, false);
      return relPath;
    }
  }

  return null;
}


export const getContentFromFilesystem = async (uri: vscode.Uri | undefined): Promise<string> => {
  if (!uri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const data = await vwfs.readFile(uri);
  return Buffer.from(data).toString('utf8');
};


export const isFeatureFile = (fileUri: vscode.Uri): boolean => {
  if (fileUri.scheme !== "file")
    return false;
  const lcPath = fileUri.path.toLowerCase();
  return lcPath.endsWith(".feature");
}


export const isStepsFile = (fileUri: vscode.Uri): boolean => {
  // fast checks first
  if (fileUri.scheme !== "file")
    return false;
  const lcPath = fileUri.path.toLowerCase();
  if (!lcPath.endsWith(".py"))
    return false;

  const getStepLibraryMatch = (projSettings: ProjectSettings, relPath: string) => {
    let stepLibMatch: StepImport | null = null;
    let currentMatchLen = 0, lenPath = 0;
    for (const stepLib of projSettings.importedSteps) {
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
    const projSettings = getProjectSettingsForFile(fileUri);
    const relPath = path.relative(projSettings.uri.fsPath, fileUri.fsPath);
    const stepLibMatch = getStepLibraryMatch(projSettings, relPath);
    if (!stepLibMatch || !new RegExp(stepLibMatch.stepFilesRx).test(relPath))
      return false;
  }

  return true;
}

export const getFeaturesFolderUriForFeatureFileUri = (projSettings: ProjectSettings, featureFileUri: vscode.Uri) => {
  for (const relFeaturesPath of projSettings.projRelativeFeatureFolders) {
    const featuresFolderUri = vscode.Uri.joinPath(projSettings.uri, relFeaturesPath);
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


// custom function to replace vscode.workspace.findFiles() functionality when required
// due to the glob INTERMITTENTLY not returning results on vscode startup in Windows OS for multiroot workspaces
export async function findFiles(directory: vscode.Uri, match: RegExp,
  cancelToken?: vscode.CancellationToken | undefined): Promise<vscode.Uri[]> {

  const entries = await vwfs.readDirectory(directory);
  const results: vscode.Uri[] = [];

  for (const entry of entries) {
    if (cancelToken && cancelToken.isCancellationRequested)
      return results;
    const fileName = entry[0];
    const fileType = entry[1];
    const entryUri = vscode.Uri.joinPath(directory, fileName);
    if (fileType === vscode.FileType.Directory) {
      results.push(...await findFiles(entryUri, match, cancelToken));
      continue;
    }
    if (match.test(entryUri.path))
      results.push(entryUri);
  }

  return results;
}


export function findFilesSync(directory: vscode.Uri, matchSubDirectory: string | undefined, extension: string,
  stopOnFirstMatch = false): vscode.Uri[] {

  const entries = fs.readdirSync(directory.fsPath);
  const results: vscode.Uri[] = [];

  for (const fileName of entries) {
    const entryPath = path.join(directory.fsPath, fileName);
    const entryUri = vscode.Uri.file(entryPath);
    if (fs.statSync(entryPath).isDirectory()) {
      const subDirResults = findFilesSync(entryUri, matchSubDirectory, extension, stopOnFirstMatch);
      results.push(...subDirResults);
      if (stopOnFirstMatch && subDirResults.length > 0)
        return results;
    }
    else {
      if (fileName.endsWith(extension) && (!matchSubDirectory || new RegExp(`/ ${matchSubDirectory} / `, "i").test(entryUri.path))) {
        results.push(entryUri);
        if (stopOnFirstMatch)
          return results;
      }
    }
  }

  return results;
}


// export function getLongestCommonPaths(projRelativeWorkingDirPath: string, paths: string[]): string[] {
//   if (paths.length === 0)
//     return [];

//   const commonPaths: string[] = [paths[0]];
//   let matched = false;

//   for (const path of paths) {
//     matched = false;
//     for (const cfp of commonPaths) {
//       if (path.startsWith(cfp + "/") || path === cfp)
//         matched = true;
//     }
//     if (matched)
//       continue;
//     commonPaths.push(path);
//   }

//   return commonPaths;
// }


export function getShortestCommonPathsExcludingLastPart(paths: string[]): string[] {
  const commonPaths: string[] = [];

  // For each path, remove the last part and add it to the commonPaths array
  for (const path of paths) {
    const pathParts = path.split('/');
    pathParts.pop(); // remove the last part
    const commonPath = pathParts.join('/');
    if (!commonPaths.includes(commonPath)) {
      commonPaths.push(commonPath);
    }
  }

  return commonPaths;
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

