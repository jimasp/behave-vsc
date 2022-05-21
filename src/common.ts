import * as vscode from 'vscode';
import { config, EXTENSION_FRIENDLY_NAME } from "./Configuration";
import { TestData } from './TestFile';
import { WorkspaceSettings } from './settings';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
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


export function getIdForUri(uri: vscode.Uri) {
  // uri.path and uri.fsPath currently seem to give inconsistent results on windows ("C:" vs "c:") 
  // (found when running integration tests vs debugging extension)
  // and we use the id for matching strings, so use toString() to provide consistent casing
  return uri.toString();
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
    // TODO: force a,b,c and check for specific error
  }
}


let workspaceFoldersWithFeatures: vscode.Uri[];


export const getUrisOfWkspFoldersWithFeatures = (forceRefresh = false): vscode.Uri[] => {

  const start = performance.now();

  if (!forceRefresh && workspaceFoldersWithFeatures)
    return workspaceFoldersWithFeatures;

  workspaceFoldersWithFeatures = [];

  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    throw "No workspace folders found";
  }

  // performance is CRITICAL here as: (a) we need it to be synchronous, and (b) it is called during activate(),
  // if you change this function, check performance before and after your 
  // changes (see console.log statement at the end of this function)

  function findAFeatureFile(fullDirPath: string): boolean {

    let entries;
    try {
      entries = fs.readdirSync(fullDirPath, { withFileTypes: true, encoding: "utf8" });
    }
    catch (e: any) { /* eslint-disable-line @typescript-eslint/no-explicit-any */
      if (e.code && e.code === "ENOENT") {
        return false; // most likely a folder specified in the *.code-workspace file doesn't exist
      }
      throw e;
    }

    let found = false;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        found = findAFeatureFile(vscode.Uri.joinPath(vscode.Uri.file(fullDirPath), entry.name).fsPath);
        if (found)
          return true;
      }
      else {
        if (entry.name.endsWith(".feature")) {
          found = true;
          return true;
        }
      }
    }
    return found;
  }


  for (const folder of folders) {
    // note - we don't use folder.name here, as that is the 
    // workspacefolder name (which can be set in *.code-workspace), not the folder name
    const folderName = path.basename(folder.uri.fsPath);
    if (config.globalSettings.multiRootFolderIgnoreList.includes(folderName))
      continue;
    if (findAFeatureFile(folder.uri.fsPath))
      workspaceFoldersWithFeatures.push(folder.uri);
  }

  if (workspaceFoldersWithFeatures.length === 0)
    throw new Error("No workspace folders contain a *.feature file"); // should never happen (because of package.json activationEvents)

  console.log(`getUrisOfWkspFoldersWithFeatures took ${performance.now() - start}ms, ` +
    `workspaceFoldersWithFeatures: ${workspaceFoldersWithFeatures.length}`);

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
    if (wkspUri === null || item.id.includes(getIdForUri(wkspUri))) {
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

  const entries = fs.readdirSync(directory.fsPath, { withFileTypes: true, encoding: "utf8" });
  const results: vscode.Uri[] = [];

  for (const entry of entries) {
    if (cancelToken.isCancellationRequested)
      return results;
    const entryUri = vscode.Uri.joinPath(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findFiles(entryUri, matchSubDirectory, extension, cancelToken));
    }
    else {
      if (entry.name.endsWith(extension) && (!matchSubDirectory || new RegExp(`/${matchSubDirectory}/`, "i").test(entryUri.path))) {
        results.push(entryUri);
      }
    }
  }

  return results;
}

