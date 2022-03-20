import * as vscode from 'vscode';
import config from "./configuration";


export function logActivate(context: vscode.ExtensionContext) {
  let version: string = context.extension.packageJSON.version;
  if (version.startsWith("0")) {
    version += " pre-release";
  }
  config.logger.logInfo(`${config.extensionFriendlyName} activated, (version ${version}).`);
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


export function logUserSettings(consoleOnly = false) {
  const configText = `\nSettings:\n${JSON.stringify(config.userSettings, null, 2)}\n`;
  if (!consoleOnly)
    config.logger.logInfo(configText);
  else
    console.log(configText);
}


export const getContentFromFilesystem = async (uri: vscode.Uri): Promise<string> => {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    return doc.getText();
  }
  catch (e: unknown) {
    config.logger.logError(e, `Error reading content from file ${uri.fsPath}`);
    return "";
  }
};
