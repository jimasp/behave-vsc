import * as vscode from 'vscode';
import { config, EXTENSION_FRIENDLY_NAME } from './Configuration';
import { getUrisOfWkspFoldersWithFeatures } from './common';


export class Logger {

  private channels: { [wkspUri: string]: vscode.OutputChannel } = {};
  public visible = false;

  syncChannelsToWorkspaceFolders() {

    const wkspUris = getUrisOfWkspFoldersWithFeatures(true);

    for (const wkspPath in this.channels) {
      this.channels[wkspPath].dispose();
      delete this.channels[wkspPath];
    }

    const wkspPaths = wkspUris.map(u => u.path);
    if (wkspPaths.length < 2) {
      this.channels[wkspUris[0].path] = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
      return;
    }

    wkspPaths.forEach(wkspPath => {
      const name = wkspPath.split("/").pop();
      if (!name)
        throw new Error("can't get workspace name from uri path");
      this.channels[wkspPath] = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME + ": " + name);
    });
  }

  dispose() {
    for (const wkspPath in this.channels) {
      this.channels[wkspPath].dispose();
    }
  }

  show = (wkspUri: vscode.Uri) => {
    this.channels[wkspUri.path].show();
  };

  clear = (wkspUri: vscode.Uri) => {
    this.channels[wkspUri.path].clear();
  };

  clearAllWksps = () => {
    for (const wkspPath in this.channels) {
      this.channels[wkspPath].clear();
    }
  };

  // log without a carriage return, used for behave output
  logInfoNoCR = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[wkspUri.path].append(text);
    if (run)
      run.appendOutput(text);
  };

  logInfo = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[wkspUri.path].appendLine(text);
    if (run)
      run.appendOutput(text + "\n");
  };

  logInfoAllWksps = (text: string, run?: vscode.TestRun) => {
    diagLog(text);

    for (const wkspPath in this.channels) {
      this.channels[wkspPath].appendLine(text);
    }

    if (run)
      run.appendOutput(text + "\n");
  };

  logWarn = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text, wkspUri, DiagLogType.warn);

    this.channels[wkspUri.path].appendLine(text);
    this.channels[wkspUri.path].show(true);

    if (run)
      run.appendOutput(text + "\n");
  };

  logWarnAllWksps = (text: string, run?: vscode.TestRun) => {
    diagLog(text, undefined, DiagLogType.warn);

    let first = true;
    for (const wkspPath in this.channels) {
      this.channels[wkspPath].appendLine(text);
      if (first) {
        this.channels[wkspPath].show(true);
        first = false;
      }
    }

    if (run)
      run.appendOutput(text + "\n");
  };


  showWarn = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    this._show(wkspUri, text, run, DiagLogType.warn);
  }


  showError = (error: unknown, wkspUri: vscode.Uri | undefined, run?: vscode.TestRun) => {

    let text: string;

    if (error instanceof Error) {
      text = error.message;
      if (config && config.globalSettings && config.globalSettings.logDiagnostics)
        text += `\n${error.stack?.split("\n").slice(1).join("\n")}`;
    }
    else {
      text = `${error}`;
    }

    this._show(wkspUri, text, run, DiagLogType.error);
  }


  private _show = (wkspUri: vscode.Uri | undefined, text: string, run: vscode.TestRun | undefined, logType: DiagLogType) => {

    if (wkspUri) {
      // note - don't use config.workspaceSettings here (possible inifinite loop)
      const wskpFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
      if (wskpFolder) {
        const wkspName = wskpFolder?.name;
        text = `${wkspName} workspace ${text}`;
      }
    }

    diagLog(text, wkspUri, logType);

    if (wkspUri) {
      this.channels[wkspUri.path].appendLine(text);
    }
    else {
      for (const wkspPath in this.channels) {
        this.channels[wkspPath].appendLine(text);
      }
    }

    if (config.integrationTestRun && !text.includes("Canceled") && !text.includes("Cancelled"))
      debugger; // eslint-disable-line no-debugger

    let winText = text;
    if (winText.length > 512)
      winText = text.substring(0, 512) + "...";


    switch (logType) {
      case DiagLogType.info:
        vscode.window.showInformationMessage(winText);
        break;
      case DiagLogType.warn:
        vscode.window.showWarningMessage(winText);
        break;
      case DiagLogType.error:
        vscode.window.showErrorMessage(winText);
        break;
    }

    //vscode.debug.activeDebugConsole.appendLine(text);
    if (run)
      run.appendOutput(text + "\n");
  }
}

export enum DiagLogType {
  "info", "warn", "error"
}

export const diagLog = (message: string, wkspUri?: vscode.Uri, logType?: DiagLogType) => {
  if (config && !config.globalSettings.logDiagnostics)
    return;

  if (wkspUri)
    message = `${wkspUri}: ${message}`;

  switch (logType) {
    case DiagLogType.error:
      console.error(message);
      break;
    case DiagLogType.warn:
      console.warn(message);
      break;
    default:
      console.log(message);
      break;
  }
}