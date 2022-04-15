import * as vscode from 'vscode';
import config from "./configuration";

export function logExtensionVersion(context: vscode.ExtensionContext) {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`${config.extensionFriendlyName} v${version}`);
}


export function logRunDiagOutput(debugRun: boolean) {

  config.logger.clear();

  if (debugRun) {
    // don't show these to user on a debug run, just log in extension/test run debug
    console.log(true);
    console.log("equivalent commands:\n");
    console.log(`cd "${config.workspaceFolderPath}"`);
    return;
  }

  vscode.commands.executeCommand("workbench.debug.panel.action.clearReplAction");
  config.userSettings.log();
  config.logger.logInfo("equivalent commands:\n");
  config.logger.logInfo(`cd "${config.workspaceFolderPath}"`);
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