import * as vscode from 'vscode';
import config, { EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { WorkspaceSettings } from './WorkspaceSettings';
const vwfs = vscode.workspace.fs;

export const logExtensionVersion = (context: vscode.ExtensionContext): void => {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`${EXTENSION_FRIENDLY_NAME} v${version}`);
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


export const getAllTestItems = (collection: vscode.TestItemCollection): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];
  collection.forEach((item: vscode.TestItem) => {
    items.push(item);
    if (item.children)
      items.push(...getAllTestItems(item.children));
  });
  return items;
}


export const getTestItem = (id: string, collection: vscode.TestItemCollection): vscode.TestItem | undefined => {
  const all = getAllTestItems(collection);
  return all.find(item => item.id === id);
}


export const countTestItemsInCollection = (items: vscode.TestItemCollection): { nodeCount: number, testCount: number } => {
  const arr = getAllTestItems(items);
  return countTestItemsInArray(arr);
}


export const getScenariolTestsInArray = (items: vscode.TestItem[]): vscode.TestItem[] => {
  const arr: vscode.TestItem[] = [];
  items.forEach((item: vscode.TestItem) => {
    if (item.uri?.path && item.children.size === 0 && item.range) {
      arr.push(item);
    }
  });
  return arr;
}

export const countTestItemsInArray = (items: vscode.TestItem[]): { nodeCount: number, testCount: number } => {
  const testCount = getScenariolTestsInArray(items).length;
  const nodeCount = items.length;
  return { nodeCount, testCount };
}

