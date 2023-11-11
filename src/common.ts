import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { customAlphabet } from 'nanoid';
import { config } from "./configuration";
import { Scenario, TestData } from './parsers/testFile';
import { StepLibrary, WorkspaceFolderSettings } from './settings';
import { diagLog } from './logger';
import { getJunitDirUri } from './watchers/junitWatcher';



const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };

export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952
export const WIN_MAX_CMD = 8191; // 8192 - 1, see https://docs.microsoft.com/en-us/windows/win32/procthread/command-line-limitation
export const FOLDERNAME_CHARS_VALID_ON_ALLPLATFORMS = /[^ a-zA-Z0-9_.-]/g;
export const BEHAVE_EXECUTION_ERROR_MESSAGE = "--- BEHAVE EXECUTION ERROR DETECTED ---"
export const BEHAVE_CONFIG_FILES = ["behave.ini", ".behaverc", "setup.cfg", "tox.ini", "pyproject.toml"];

export const sepr = ":////:"; // separator that cannot exist in file paths, i.e. safe for splitting in a path context
export const beforeFirstSepr = (str: string) => str.substring(0, str.indexOf(sepr));
export const afterFirstSepr = (str: string) => str.substring(str.indexOf(sepr) + sepr.length, str.length);


// the main purpose of WkspError is that it enables us to have an error containing a workspace uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the logger can log to the specific workspace output window
// - the logger can use the workspace name in the notification window
// - the error is only logged/displayed once 
// - the top-level catch can simply call config.logger.showError(e) and Logger will handle the rest
// for more info on error handling, see contributing.md
export class WkspError extends Error {
  constructor(errorOrMsg: unknown, public wkspUri: vscode.Uri, public run?: vscode.TestRun) {
    const msg = errorOrMsg instanceof Error ? errorOrMsg.message : errorOrMsg as string;
    super(msg);
    this.stack = errorOrMsg instanceof Error ? errorOrMsg.stack : undefined;
    Object.setPrototypeOf(this, WkspError.prototype);
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
  config.logger.logInfoAllWksps(`Behave VSC v${outputVersion}`);
  config.logger.logInfoAllWksps(`Release notes: ${releaseNotesUrl}`);
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

  const dirUri = config.extensionTempFilesUri;
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
    // we will get here if (a) the folder doesn't exist, or (b) the user has the folder open
  }
}



// get the actual value in the file or return undefined, this is
// for cases where we need to distinguish between an unset value and the default value
export const getActualWorkspaceSetting = <T>(wkspConfig: vscode.WorkspaceConfiguration, name: string): T => {
  const value = wkspConfig.inspect(name)?.workspaceFolderValue;
  return (value as T);
}

export const normalise_relative_path = (path: string) => {
  return path.replace(/\\/g, "/").replace(/^\//, "").replace(/\/$/, "").trim();
}

let workspaceFoldersWithFeatures: vscode.Uri[];
export const getUrisOfWkspFoldersWithFeatures = (forceRefresh = false): vscode.Uri[] => {

  // NOTE: this function must be fast (ideally < 1ms) 
  // so we'll default to returning a simple cached value
  if (!forceRefresh && workspaceFoldersWithFeatures)
    return workspaceFoldersWithFeatures;

  const start = performance.now();
  workspaceFoldersWithFeatures = [];

  function hasFeaturesFolder(folder: vscode.WorkspaceFolder): boolean {
    // check performance (diagLog below) if you change these functions
    const configPaths = getProjectRelativeConfigPaths(folder.uri);
    const featurePaths = getProjectRelativeFeaturePaths(folder.uri, configPaths);
    return featurePaths.length > 0;
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders)
    throw "No workspace folders found";

  for (const folder of folders) {
    if (hasFeaturesFolder(folder))
      workspaceFoldersWithFeatures.push(folder.uri);
  }

  diagLog(`perf info: getUrisOfWkspFoldersWithFeatures took ${performance.now() - start} ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

  if (workspaceFoldersWithFeatures.length === 0) {
    if (folders.length === 1 && folders[0].name === "behave-vsc")
      throw `Please disable the marketplace Behave VSC extension before beginning development!`;
  }

  return workspaceFoldersWithFeatures;
}


export const getWorkspaceUriForFile = (fileorFolderUri: vscode.Uri | undefined): vscode.Uri => {
  if (fileorFolderUri?.scheme !== "file")
    throw new Error(`Unexpected scheme: ${fileorFolderUri?.scheme}`);
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const wkspUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!wkspUri)
    throw "No workspace folder found for file " + fileorFolderUri.fsPath;
  return wkspUri;
}


export const getWorkspaceSettingsForFile = (fileorFolderUri: vscode.Uri | undefined): WorkspaceFolderSettings => {
  const wkspUri = getWorkspaceUriForFile(fileorFolderUri);
  return config.workspaceSettings[wkspUri.path];
}


export const getWorkspaceFolder = (wskpUri: vscode.Uri): vscode.WorkspaceFolder => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(wskpUri);
  if (!workspaceFolder)
    throw new Error("No workspace folder found for uri " + wskpUri.path);
  return workspaceFolder;
}


export const getProjectRelativeFeaturePaths = (wkspUri: vscode.Uri, projectRelativeConfigPaths: string[]): string[] => {

  // NOTE: check performance of getUrisOfWkspFoldersWithFeatures if you change this function  

  const allFeatureRelPaths: string[] = [];
  for (const fPath of projectRelativeConfigPaths) {
    const featureUri = findFilesSync(wkspUri, fPath, ".feature");
    const relPaths = featureUri.map(featureUri => path.relative(wkspUri.fsPath, path.dirname(featureUri.fsPath)).replace(/\\/g, "/"));
    allFeatureRelPaths.push(...relPaths);
  }
  /* 
  we want the longest common .feature paths, such that this structure:
    my_project
    └── tests
        ├── doctest
        │   └── mydoctest.py
        ├── pytest
        │    └── unittest.py    
        ├── features
        │   ├── a.feature
        │   └── web
        │       └── a.feature
        └── features2
            └── a.feature
  will return:
  - "tests/features"
  - "tests/features2"
  */
  const longestCommonPaths = findLongestCommonPaths(allFeatureRelPaths);

  // default to watching for features path
  // TODO: check if this works, i.e. if the watch works on it being created
  if (longestCommonPaths.length === 0)
    longestCommonPaths.push("features");

  return longestCommonPaths;
}


export const getProjectRelativeConfigPaths = (wkspUri: vscode.Uri): string[] => {

  // NOTE: check performance of getUrisOfWkspFoldersWithFeatures if you change this function

  const projectRelativeConfigPaths: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: { [key: string]: any; } | undefined = undefined;
  let section = "behave";
  // match order of preference in behave source "config_filenames()" function
  for (const configFile of BEHAVE_CONFIG_FILES.reverse()) {
    const file = path.join(wkspUri.fsPath, configFile);
    if (fs.existsSync(file)) {
      if (configFile === "pyproject.toml")
        section = "tool.behave";
      config = _configParser(file)
      break;
    }
  }

  if (config) {
    let configPaths = config[section]?.paths;
    if (configPaths) {
      if (typeof configPaths === "string")
        configPaths = [configPaths];
      configPaths.forEach((path: string) => {
        path = path.trim().replace(wkspUri.fsPath, "");
        path = normalise_relative_path(path);
        projectRelativeConfigPaths.push(path);
      });
    }
  }

  return projectRelativeConfigPaths
}


export const findSubDirectorySync = (searchPath: string, targetDirName: string): string | null => {
  const files = fs.readdirSync(searchPath);
  for (const file of files) {
    const filePath = path.join(searchPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      if (file === targetDirName) {
        return filePath;
      } else {
        const result = findSubDirectorySync(filePath, targetDirName);
        if (result !== null) {
          return result;
        }
      }
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


export const isStepsFile = (fileUri: vscode.Uri): boolean => {
  if (fileUri.scheme !== "file")
    return false;
  const lcPath = fileUri.path.toLowerCase();
  if (!lcPath.endsWith(".py"))
    return false;

  function getStepLibraryMatch(wkspSettings: WorkspaceFolderSettings, relPath: string) {
    let stepLibMatch: StepLibrary | null = null;
    let currentMatchLen = 0, lenPath = 0;
    for (const stepLib of wkspSettings.stepLibraries) {
      if (relPath.startsWith(stepLib.relativePath))
        lenPath = stepLib.relativePath.length;
      if (lenPath > currentMatchLen) {
        currentMatchLen = lenPath;
        stepLibMatch = stepLib;
      }
    }
    return stepLibMatch;
  }

  if (!lcPath.includes("/steps/")) {
    const wkspSettings = getWorkspaceSettingsForFile(fileUri);
    const relPath = path.relative(wkspSettings.uri.fsPath, fileUri.fsPath);
    const stepLibMatch = getStepLibraryMatch(wkspSettings, relPath);

    if (!stepLibMatch || !new RegExp(stepLibMatch.stepFilesRx).test(relPath))
      return false;
  }

  return true;
}

export const getFeaturesUriForFeatureFileUri = (wkspSettings: WorkspaceFolderSettings, featureFileUri: vscode.Uri) => {
  for (const relFeaturesPath of wkspSettings.relativeFeaturePaths) {
    const featuresUri = vscode.Uri.joinPath(wkspSettings.uri, relFeaturesPath);
    if (featureFileUri.fsPath.startsWith(featuresUri.fsPath + path.sep))
      return featuresUri;
  }
}


export const isFeatureFile = (fileUri: vscode.Uri): boolean => {
  if (fileUri.scheme !== "file")
    return false;
  const lcPath = fileUri.path.toLowerCase();
  return lcPath.endsWith(".feature");
}


export const getAllTestItems = (wkspId: string | null, collection: vscode.TestItemCollection): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];

  // get all test items if wkspUri is null, or
  // just the ones in the current workspace if wkspUri is supplied 
  collection.forEach((item: vscode.TestItem) => {
    if (wkspId === null || item.id.includes(wkspId)) {
      items.push(item);
      if (item.children)
        items.push(...getAllTestItems(wkspId, item.children));
    }
  });

  return items;
}


export const countTestItemsInCollection = (wkspId: string | null, testData: TestData, items: vscode.TestItemCollection): TestCounts => {
  const arr = getAllTestItems(wkspId, items);
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
export async function findFiles(directory: vscode.Uri, matchSubDirectory: string | undefined,
  extension: string, cancelToken?: vscode.CancellationToken | undefined): Promise<vscode.Uri[]> {

  const entries = await vwfs.readDirectory(directory);
  const results: vscode.Uri[] = [];

  for (const entry of entries) {
    if (cancelToken && cancelToken.isCancellationRequested)
      return results;
    const fileName = entry[0];
    const fileType = entry[1];
    const entryUri = vscode.Uri.joinPath(directory, fileName);
    if (fileType === vscode.FileType.Directory) {
      results.push(...await findFiles(entryUri, matchSubDirectory, extension, cancelToken));
    }
    else {
      if (fileName.endsWith(extension) && (!matchSubDirectory || new RegExp(`/${matchSubDirectory}/`, "i").test(entryUri.path))) {
        results.push(entryUri);
      }
    }
  }

  return results;
}


export function findFilesSync(directory: vscode.Uri, matchSubDirectory: string | undefined, extension: string): vscode.Uri[] {
  const entries = fs.readdirSync(directory.fsPath);
  const results: vscode.Uri[] = [];

  for (const fileName of entries) {
    const entryPath = path.join(directory.fsPath, fileName);
    const entryUri = vscode.Uri.file(entryPath);
    if (fs.statSync(entryPath).isDirectory()) {
      results.push(...findFilesSync(entryUri, matchSubDirectory, extension));
    }
    else {
      if (fileName.endsWith(extension) && (!matchSubDirectory || new RegExp(`/${matchSubDirectory}/`, "i").test(entryUri.path))) {
        results.push(entryUri);
      }
    }
  }

  return results;
}


export function findLongestCommonPaths(paths: string[]): string[] {
  const commonPaths: string[] = [];

  for (const filePath of paths) {
    const pathParts = filePath.split('/');
    let commonPath = pathParts[0];

    for (let i = 1; i < pathParts.length - 1; i++) {
      commonPath += '/' + pathParts[i];
      if (!paths.some(path => path.startsWith(commonPath + '/'))) {
        break;
      }
    }

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


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _configParser(filePath: string): { [key: string]: any; } {

  const data = fs.readFileSync(filePath, 'utf-8');
  const lines = data.split('\n');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: { [key: string]: any } = {};
  let currentSection = '';
  let currentValue: string | string[] = '';
  let currentKey = '';

  let toml = false;
  if (filePath.endsWith(".toml"))
    toml = true;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line.startsWith(';'))
      continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      config[currentSection] = {};
    }
    else if (line.includes('=')) {
      let [key, value] = line.split('=');
      key = key.trim();
      value = value.trim();
      if (toml) {
        if (value.startsWith("[") && value.endsWith("]")) {
          const arr = value.split(",");
          config[currentSection][key] = arr;
          continue;
        }
      }
      else {
        currentValue = value;
        currentKey = key;
      }
      config[currentSection][key] = value;
    }
    else {
      if (toml)
        continue;
      if (line.length > 0) {
        const arr: string[] = [];
        if (currentValue instanceof Array)
          arr.push(...currentValue);
        else
          arr.push(currentValue);
        arr.push(line);
        currentValue = arr;
        config[currentSection][currentKey] = arr;
      }
    }
  }

  return config;
}

