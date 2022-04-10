import * as vscode from 'vscode';
import config from "./configuration";

export function logActivate(context: vscode.ExtensionContext) {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`${config.extensionFriendlyName} v${version}`);
  logUserSettings();
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
  logUserSettings();
  config.logger.logInfo("equivalent commands:\n");
  config.logger.logInfo(`cd "${config.workspaceFolderPath}"`);
}


export function logUserSettings() {

  const keys = Object.keys(config.userSettings).sort();
  keys.splice(keys.indexOf("fullFeaturesPath"), 1);
  const json = JSON.stringify(config.userSettings, keys, 2);
  const output = `\nsettings:\n${json}\n`;
  config.logger.logInfo(output);
  config.logger.logInfo(`fullFeaturesPath: ${config.userSettings.fullFeaturesPath}\n`);
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