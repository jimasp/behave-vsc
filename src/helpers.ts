import * as vscode from 'vscode';
import config, { EXTENSION_FRIENDLY_NAME, WorkspaceSettings } from "./configuration";


export const logExtensionVersion = (context: vscode.ExtensionContext) => {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`${EXTENSION_FRIENDLY_NAME} v${version}`);
}

export function logRunDiagOutput(debugRun: boolean, wkspSettings: WorkspaceSettings) {

  if (debugRun) {
    // just log for extension devs
    console.log(true);
    console.log(`cd "${wkspSettings.fullWorkingDirectoryPath}\n`);
    return;
  }

  config.logger.logInfo("\n\n--- starting test run for workspace " + wkspSettings.workspaceFolder.uri.path + " ---\n\n");
  config.logger.logInfo(`cd "${wkspSettings.fullWorkingDirectoryPath}"\n`);
}

export const getWorkspaceFolderUris = (): vscode.Uri[] => {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) {
    throw new Error("No workspace folders found");
  }
  return folders.map(folder => folder.uri);
}

export const getWorkspaceUriForFile = (fileorFolderUri: vscode.Uri | undefined) => {
  if (!fileorFolderUri) // handling this here for caller convenience
    throw new Error("uri is undefined");
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileorFolderUri);
  const wkspUri = workspaceFolder ? workspaceFolder.uri : undefined;
  if (!wkspUri)
    throw new Error("No workspace folder found for uri " + fileorFolderUri.path);
  return wkspUri;
}

export const getWorkspaceSettingsForFile = (fileorFolderUri: vscode.Uri | undefined) => {
  const wkspUri = getWorkspaceUriForFile(fileorFolderUri);
  return config.workspaceSettings(wkspUri);
}

export const getWorkspaceFolder = (wskpUri: vscode.Uri) => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(wskpUri);
  if (!workspaceFolder)
    throw new Error("No workspace folder found for uri " + wskpUri.path);
  return workspaceFolder;
}

export const getContentFromFilesystem = async (uri: vscode.Uri): Promise<string> => {
  const doc = await vscode.workspace.openTextDocument(uri);
  return doc.getText();
};


export const isStepsFile = (uri: vscode.Uri) => {
  const path = uri.path.toLowerCase();
  return path.indexOf("/steps/") !== -1 && path.endsWith(".py");
}


export const isFeatureFile = (uri: vscode.Uri) => {
  return uri.path.toLowerCase().endsWith(".feature");
}