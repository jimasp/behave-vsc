import * as vscode from 'vscode';
import { config } from './configuration';
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
      this.channels[wkspUris[0].path] = vscode.window.createOutputChannel("Behave VSC");
      return;
    }

    wkspPaths.forEach(wkspPath => {
      const name = wkspPath.split("/").pop();
      if (!name)
        throw new Error("can't get workspace name from uri path");
      this.channels[wkspPath] = vscode.window.createOutputChannel(`Behave VSC: ${name}`);
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


  logInfoAllWksps = (text: string, run?: vscode.TestRun) => {
    diagLog(text);

    for (const wkspPath in this.channels) {
      this.channels[wkspPath].appendLine(text);
    }

    if (run)
      run.appendOutput(text + "\r\n");
  };


  logInfo = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[wkspUri.path].appendLine(text);
    if (run)
      run.appendOutput(text + "\r\n");
  };

  // log info without a line feed (used for logging behave output)
  logInfoNoLF = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[wkspUri.path].append(text);
    if (run)
      run.appendOutput(text);
  };

  // used by settings.ts 
  logSettingsWarning = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text, wkspUri, DiagLogType.warn);

    this.channels[wkspUri.path].appendLine(text);
    this.channels[wkspUri.path].show(true);

    if (run)
      run.appendOutput(text + "\r\n");
  };


  showWarn = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    this._show(text, wkspUri, run, DiagLogType.warn);
  }


  showError = (error: unknown, wkspUri?: vscode.Uri | undefined, run?: vscode.TestRun) => {

    let text: string;

    if (error instanceof Error) {
      text = error.message;
      if (error.stack && config && config.globalSettings && config.globalSettings.xRay)
        text += `\n${error.stack.split("\n").slice(1).join("\n")}`;
    }
    else {
      text = `${error}`;
    }

    this._show(text, wkspUri, run, DiagLogType.error);
  }


  private _show = (text: string, wkspUri: vscode.Uri | undefined, run: vscode.TestRun | undefined, logType: DiagLogType) => {

    diagLog(text, wkspUri, logType);

    if (wkspUri) {
      this.channels[wkspUri.path].appendLine(text);
    }
    else {
      for (const wkspPath in this.channels) {
        this.channels[wkspPath].appendLine(text);
      }
    }

    if (config.exampleProject && !text.includes("Canceled") && !text.includes("Cancelled")) {
      debugger; // eslint-disable-line no-debugger
    }


    let winText = text;
    if (wkspUri) {
      // note - don't use config.workspaceSettings here (possible inifinite loop)
      const wskpFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
      if (wskpFolder) {
        const wkspName = wskpFolder?.name;
        winText = `${wkspName} workspace: ${text}`;
      }
    }

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
      run.appendOutput(text.replace("\n", "\r\n") + "\r\n");
  }
}

export enum DiagLogType {
  "info", "warn", "error"
}

export const diagLog = (message: string, wkspUri?: vscode.Uri, logType?: DiagLogType) => {
  if (config && !config.globalSettings.xRay && !config.integrationTestRun && !config.exampleProject)
    return;

  if (wkspUri)
    message = `${wkspUri}: ${message}`;

  message = `[Behave VSC] ${message}`;

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