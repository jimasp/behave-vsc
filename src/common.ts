import * as vscode from 'vscode';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { customAlphabet } from 'nanoid';
import { config } from "./configuration";
import { Scenario, TestData } from './parsing/testFile';
import { WorkspaceSettings } from './settings';
import { diagLog } from './logger';


const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };

export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952

export const sepr = "::"; // standard separator (unsafe for splitting)
export const beforeFirstSepr = (str: string) => str.substring(0, str.indexOf(sepr));
export const afterFirstSepr = (str: string) => str.substring(str.indexOf(sepr) + sepr.length, str.length);
export const pathSepr = "////"; // separator that cannot exist in file paths, safe for splitting in a path context
export const afterPathSepr = (str: string) => str.split(pathSepr)[1];


// the main purpose of WkspError is that it enables us to have an error containing a workspace uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the logger can use the workspace name in the notification window
// - the logger can log to the specific workspace output window
// - the error is only logged/displayed once 
// - the top-level catch can simply call config.logger.showError(e) and Logger will handle the rest
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


// these two uri match functions are here to highlight why uri.toString() is needed:
// 1. both uri.path and uri.fsPath BOTH give inconsistent casing of the drive letter on windows ("C:" vs "c:") 
// whether uri1.path === uri2.path or uri1.fsPath === uri2.fsPath depends on whether both uris are being set/read on
// a similar code stack (i.e. whether both used "C" or "c" when the value was set).
// at any rate, for matching one uri path or fsPath to another we can use toString() to provide consistent casing.
// 2. separately, two uris that point to the same path (regardless of casing) may not be the same object, so uri1 === uri2 would fail
// so whenever we plan to use a uri in an equals comparison we should use one of these functions
export function uriMatchString(uri: vscode.Uri) {
  return uri.toString();
}

export function urisMatch(uri1: vscode.Uri, uri2: vscode.Uri) {
  return uri1.toString() === uri2.toString();
}


export async function removeExtensionTempDirectory(cancelToken: vscode.CancellationToken) {
  await removeDirectoryRecursive(config.extensionTempFilesUri, cancelToken);
}


export async function removeDirectoryRecursive(dirUri: vscode.Uri, cancelToken: vscode.CancellationToken) {

  try {
    const children = await vwfs.readDirectory(dirUri);

    for (const [name,] of children) {
      if (!cancelToken.isCancellationRequested) {
        const curUri = vscode.Uri.joinPath(dirUri, name);
        await vwfs.delete(curUri, { recursive: true, useTrash: true });
      }
    }

    if (!cancelToken.isCancellationRequested)
      await vwfs.delete(dirUri, { recursive: true, useTrash: true });
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


// THIS FUNCTION MUST BE FAST (ideally < 1ms) 
// (check performance if you change it)
let workspaceFoldersWithFeatures: vscode.Uri[];
export const getUrisOfWkspFoldersWithFeatures = (forceRefresh = false): vscode.Uri[] => {

  if (!forceRefresh && workspaceFoldersWithFeatures)
    return workspaceFoldersWithFeatures;

  const start = performance.now();
  workspaceFoldersWithFeatures = [];

  function hasFeaturesFolder(folder: vscode.WorkspaceFolder): boolean {

    // default features path, no settings.json required
    let featuresUri = vscode.Uri.joinPath(folder.uri, "features");

    // try/catch with await vwfs.stat(uri) is much too slow atm
    const hasDefaultFeaturesFolder = fs.existsSync(featuresUri.fsPath);

    // check if featuresPath specified in settings.json
    // NOTE: this will return package.json defaults (or failing that, type defaults) if no settings.json found, i.e. "features" if no settings.json
    const wkspConfig = vscode.workspace.getConfiguration("behave-vsc", folder.uri);
    const featuresPath = getActualWorkspaceSetting(wkspConfig, "featuresPath");
    if (!featuresPath && !hasDefaultFeaturesFolder) {
      return false; // probably a workspace with no behave requirements
    }

    // default features folder and nothing specified in settings.json (or default specified)
    if (hasDefaultFeaturesFolder && !featuresPath)
      return true;

    featuresUri = vscode.Uri.joinPath(folder.uri, featuresPath as string);
    if (fs.existsSync(featuresUri.fsPath) && vscode.workspace.getWorkspaceFolder(featuresUri) === folder)
      return true;

    // (we may not have a logger yet, and notification window is probably more appropriate for start up)
    vscode.window.showWarningMessage(`Specified features path "${featuresPath}" not found in workspace "${folder.name}". ` +
      `Behave VSC will ignore this workspace until this is corrected.`);

    return false;
  }


  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    throw "No workspace folders found";
  }

  for (const folder of folders) {
    if (hasFeaturesFolder(folder)) {
      workspaceFoldersWithFeatures.push(folder.uri);
    }
  }

  diagLog(`perf info: getUrisOfWkspFoldersWithFeatures took ${performance.now() - start} ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

  if (workspaceFoldersWithFeatures.length === 0) {
    if (folders.length === 1 && folders[0].name === "behave-vsc")
      throw `Please disable the marketplace Behave VSC extension before beginning development!`;
    else
      throw `Extension was activated because a '*.feature' file was found in a workspace folder, but ` +
      `none of the workspace folders contain either a root 'features' folder or a settings.json that specifies a valid 'behave-vsc.featuresPath'.\n` +
      `Please add a valid 'behave-vsc.featuresPath' property to your workspace settings.json file and then restart vscode.`;
  }

  return workspaceFoldersWithFeatures;
}


export const getWorkspaceUriForFile = (fileorFolderUri: vscode.Uri | undefined): vscode.Uri => {
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const wkspUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!wkspUri)
    throw "No workspace folder found for file " + fileorFolderUri.fsPath;
  return wkspUri;
}


export const getWorkspaceSettingsForFile = (fileorFolderUri: vscode.Uri | undefined): WorkspaceSettings => {
  const wkspUri = getWorkspaceUriForFile(fileorFolderUri);
  return config.workspaceSettings[wkspUri.path];
}


export const getWorkspaceFolder = (wskpUri: vscode.Uri): vscode.WorkspaceFolder => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(wskpUri);
  if (!workspaceFolder)
    throw new Error("No workspace folder found for uri " + wskpUri.path);
  return workspaceFolder;
}


export const getContentFromFilesystem = async (uri: vscode.Uri): Promise<string> => {
  const data = await vwfs.readFile(uri);
  return Buffer.from(data).toString('utf8');
};


export const isStepsFile = (uri: vscode.Uri): boolean => {
  const path = uri.path.toLowerCase();
  return path.includes("/steps/") && path.endsWith(".py") && !path.endsWith("/__init__.py");
}


export const isFeatureFile = (uri: vscode.Uri) => {
  return uri.path.toLowerCase().endsWith(".feature");
}


export const getAllTestItems = (wkspUri: vscode.Uri | null, collection: vscode.TestItemCollection): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];

  // get all test items if wkspUri is null, or
  // just the ones in the current workspace if wkspUri is supplied 
  collection.forEach((item: vscode.TestItem) => {
    if (wkspUri === null || item.id.includes(uriMatchString(wkspUri))) {
      items.push(item);
      if (item.children)
        items.push(...getAllTestItems(wkspUri, item.children));
    }
  });

  return items;
}


export const countTestItemsInCollection = (wkspUri: vscode.Uri | null, testData: TestData, items: vscode.TestItemCollection): TestCounts => {
  const arr = getAllTestItems(wkspUri, items);
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


// custom function to replace vscode.workspace.findFiles() functionality as required
// due to the glob INTERMITTENTLY not returning results on vscode startup in Windows OS for multiroot workspaces
// TODO: retest via 'npm run test' on windows and see if this is still required after recent changes
export async function findFiles(directory: vscode.Uri, matchSubDirectory: string | undefined,
  extension: string, cancelToken: vscode.CancellationToken): Promise<vscode.Uri[]> {

  const entries = await vwfs.readDirectory(directory);
  const results: vscode.Uri[] = [];

  for (const entry of entries) {
    if (cancelToken.isCancellationRequested)
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


// we can't distinguish behave execution errors by exit code
// a normal assertion failure gives an exit code of 1, but so do lots of other issues
// so we need to check the stdout/stderr.
// we do this so that we know whether we can expect junit files to 
// be created (just an assertion failure) or stop the run and mark tests as failed in the UI
export function isBehaveExecutionError(outputStr: string) {
  const errRe = /^(Traceback|ParserError:|ConfigError:)/;
  return errRe.test(outputStr);
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
