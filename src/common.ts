import * as vscode from 'vscode';
import { config, EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { TestData } from './TestFile';
import { WorkspaceSettings } from './settings';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { diagLog } from './Logger';
import * as glob from 'glob';
const vwfs = vscode.workspace.fs;

export type TestCounts = { nodeCount: number, testCount: number };


// the main purpose of WkspError is that it enables us to have an error containing a workspace uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the logger can use the workspace uri to log the error to the correct output window
// - the error is only logged once 
// - the top level catch can just config.logError(e)
export class WkspError extends Error {
  constructor(errorOrMsg: unknown, public wkspUri: vscode.Uri, public run?: vscode.TestRun) {
    const msg = (errorOrMsg instanceof Error ? (errorOrMsg.stack ? errorOrMsg.stack : errorOrMsg.message) : errorOrMsg as string);
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


export function getTestIdForUri(uri: vscode.Uri) {
  // uri.path and uri.fsPath currently seem to give inconsistent results on windows ("C:" vs "c:") 
  // (found when running integration tests vs debugging extension)
  // and we use the id for matching strings, so use toString() to provide consistent casing
  return uri.toString();
}


export async function removeTempDirectory(cancelToken: vscode.CancellationToken) {
  await removeDirectoryRecursivexx(config.extTempFilesUri, cancelToken);
}

export async function removeDirectoryRecursivexx(dirUri: vscode.Uri, cancelToken: vscode.CancellationToken) {

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
    // TODO: force a,b,c and check for specific error
  }
}


let workspaceFoldersWithFeatures: vscode.Uri[];


// THIS FUNCTION MUST BE FAST AND MUST BE SYNCHRONOUS
export const getUrisOfWkspFoldersWithFeatures = (forceRefresh = false): vscode.Uri[] => {

  if (!forceRefresh && workspaceFoldersWithFeatures)
    return workspaceFoldersWithFeatures;

  const start = performance.now();
  workspaceFoldersWithFeatures = [];

  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    throw "No workspace folders found";
  }

  interface Settings {
    "behave-vsc.featuresPath": string,
  }

  function hasTopLevelFeatureFolder(wkspUri: vscode.Uri) {
    const featureFileUri = vscode.Uri.joinPath(wkspUri, "features");
    if (fs.existsSync(featureFileUri.fsPath))
      return true;

    return false;
  }

  function hasSettingsFileWithFeaturesPath(wkspUri: vscode.Uri) {
    const settingsFileUri = vscode.Uri.joinPath(wkspUri, ".vscode/settings.json");
    if (!fs.existsSync(settingsFileUri.fsPath))
      return false;

    const contents = fs.readFileSync(settingsFileUri.fsPath, 'utf8');
    const settings = JSON.parse(contents) as Settings;
    if (settings["behave-vsc.featuresPath"])
      return true;

    return false;
  }

  for (const folder of folders) {
    if (hasTopLevelFeatureFolder(folder.uri)) {
      workspaceFoldersWithFeatures.push(folder.uri);
      continue;
    }

    if (hasSettingsFileWithFeaturesPath(folder.uri))
      workspaceFoldersWithFeatures.push(folder.uri);
  }

  diagLog(`findFirstFeatureFileRecursive took ${performance.now() - start}ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

  if (workspaceFoldersWithFeatures.length === 0)
    throw new Error("No workspace folders contain a ./features folder or a settings.json that specifies behave-vsc.featuresPath");

  return workspaceFoldersWithFeatures;
}


export const getWorkspaceUriForFile = (fileorFolderUri: vscode.Uri | undefined): vscode.Uri => {
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const wkspUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!wkspUri)
    throw new Error("No workspace folder found for file uri " + fileorFolderUri.path);
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
    if (wkspUri === null || item.id.includes(getTestIdForUri(wkspUri))) {
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
// due to the glob intermittently not returning results on vscode startup in Windows OS for multiroot workspaces
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

