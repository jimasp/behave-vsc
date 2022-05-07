import * as vscode from 'vscode';
import config, { EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { TestData } from './TestFile';
import { WorkspaceSettings } from './WorkspaceSettings';
const vwfs = vscode.workspace.fs;

export type TestCounts = { nodeCount: number, testCount: number };


// the main purpose of WkspError is that it enables us to have an error containing a workspace uri that 
// can (where required) be thrown back up to the top level of the stack. this means that:
// - the error is only logged once 
// - the top level catch can just config.logError(e)
// - the logger can use the workspace uri to log the error to the correct output window
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
    // don't log this for users - we will get here if (a) the folder doesn't exist, or (b) the user has the folder open
    console.error(e);
  }
}


export const getWorkspaceFolderUris = (): vscode.Uri[] => {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    throw new Error("No workspace folders found");
  }
  return folders.map(folder => folder.uri);
}


export const getWorkspaceUriForFile = (fileorFolderUri: vscode.Uri | undefined): vscode.Uri => {
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const wkspUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!wkspUri)
    throw new Error("No workspace folder found for uri " + fileorFolderUri.path);
  return wkspUri;
}


export const getWorkspaceSettingsForFile = (fileorFolderUri: vscode.Uri | undefined): WorkspaceSettings => {
  const wkspUri = getWorkspaceUriForFile(fileorFolderUri);
  return config.getWorkspaceSettings(wkspUri);
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

  // get all test items, or just the ones in the current workspace if wkspUri supplied  
  collection.forEach((item: vscode.TestItem) => {
    if (wkspUri === null || item.id.includes(wkspUri.path)) {
      items.push(item);
      if (item.children)
        items.push(...getAllTestItems(wkspUri, item.children));
    }
  });

  return items;
}


export const getTestItem = (id: string, collection: vscode.TestItemCollection): vscode.TestItem | undefined => {
  const all = getAllTestItems(null, collection);
  return all.find(item => item.id === id);
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