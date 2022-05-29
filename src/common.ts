import * as vscode from 'vscode';
import { config, EXTENSION_FRIENDLY_NAME, EXTENSION_NAME } from "./Configuration";
import { TestData } from './TestFile';
import { WorkspaceSettings } from './settings';
import { performance } from 'perf_hooks';
import { diagLog } from './Logger';
import * as fs from 'fs';

const vwfs = vscode.workspace.fs;
export type TestCounts = { nodeCount: number, testCount: number };


// the main purpose of WkspError is that it enables us to have an error containing a workspace uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the logger can use the workspace name in the notification window
// - the logger can log to the specific workspace output window
// - the error is only logged/displayed once 
// - the top-level catch can simply call config.logger.showError(e) and Logger will handle the rest
export class WkspError extends Error {
  constructor(errorOrMsg: unknown, public wkspUri: vscode.Uri, public run?: vscode.TestRun) {
    const msg = (errorOrMsg instanceof Error ? errorOrMsg.message : errorOrMsg as string);
    super(msg);
    Object.setPrototypeOf(this, WkspError.prototype);
  }
}


export const logExtensionVersion = (context: vscode.ExtensionContext): void => {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfoAllWksps(`${EXTENSION_FRIENDLY_NAME} v${version}`);
}


// this function is here to highlight why uri.toString() is needed:
// uri.path and uri.fsPath give inconsistent casing on windows ("C:" vs "c:") 
// so for matching one uri to another we need to use toString() to provide consistent casing
export function getUriMatchString(uri: vscode.Uri) {
  return uri.toString();
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


let workspaceFoldersWithFeatures: vscode.Uri[];



// get the actual value in the file or return undefined, this is
// for cases where we need to distinguish between an unset value and the default value
export const getActualWorkspaceSetting = <T>(wkspConfig: vscode.WorkspaceConfiguration, name: string): T => {
  const value = wkspConfig.inspect(name)?.workspaceFolderValue;
  return (value as T);
}


// THIS FUNCTION MUST BE FAST (< 10ms) 
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
    const wkspConfig = vscode.workspace.getConfiguration(EXTENSION_NAME, folder.uri);
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

  diagLog(`PERFORMANCE: getUrisOfWkspFoldersWithFeatures took ${performance.now() - start}ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

  if (workspaceFoldersWithFeatures.length === 0) {
    if (folders.length === 1 && folders[0].name === EXTENSION_NAME)
      throw `Please disable the marketplace ${EXTENSION_FRIENDLY_NAME} extension before beginning development!`;
    else
      throw `Extension was activated because a '.feature' file was found in a workspace folder, but ` +
      `no workspace folders contain either a root 'features' folder or a settings.json that specifies '${EXTENSION_NAME}.featuresPath'.\n` +
      `Please add a '${EXTENSION_NAME}.featuresPath' property to the workspace settings.json file and then restart vscode.`;
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
    if (wkspUri === null || item.id.includes(getUriMatchString(wkspUri))) {
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
    if (data && data.constructor.name === "Scenario")
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
// so we need to check the stderr message.
// we do this so that we know whether we can expect junit files to 
// be created (just an assertion failure) or stop the run and mark tests as failed in the UI
export function isBehaveExecutionError(stderrStr: string) {
  if (stderrStr.startsWith("Traceback"))
    return true;
  return false;
}

export function showDebugWindow() {
  vscode.commands.executeCommand("workbench.debug.action.toggleRepl");
}