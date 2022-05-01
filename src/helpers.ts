import * as vscode from 'vscode';
import config, { EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { TestData } from './TestFile';
import { WorkspaceSettings } from './WorkspaceSettings';
const vwfs = vscode.workspace.fs;

export type TestCounts = { nodeCount: number, testCount: number };

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

