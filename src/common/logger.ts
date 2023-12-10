import * as vscode from 'vscode';
import { config } from '../config/configuration';
import { getUrisOfWkspFoldersWithFeatures } from './helpers';


export class Logger {

  private channels: { [projUri: string]: vscode.OutputChannel } = {};
  public visible = false;

  syncChannelsToWorkspaceFolders() {

    const projUris = getUrisOfWkspFoldersWithFeatures(true);

    for (const projPath in this.channels) {
      this.channels[projPath].dispose();
      delete this.channels[projPath];
    }

    const projPaths = projUris.map(u => u.path);
    if (projPaths.length < 2) {
      this.channels[projUris[0].path] = vscode.window.createOutputChannel("Behave VSC");
      return;
    }

    projPaths.forEach(projPath => {
      const name = projPath.split("/").pop();
      if (!name)
        throw new Error("can't get project name from uri path");
      this.channels[projPath] = vscode.window.createOutputChannel(`Behave VSC: ${name}`);
    });
  }

  dispose() {
    for (const projPath in this.channels) {
      this.channels[projPath].dispose();
    }
  }

  show = (projUri: vscode.Uri) => {
    this.channels[projUri.path].show();
  };

  clear = (projUri: vscode.Uri) => {
    this.channels[projUri.path].clear();
  };

  clearAllProjects = () => {
    for (const projPath in this.channels) {
      this.channels[projPath].clear();
    }
  };


  logInfoAllProjects = (text: string, run?: vscode.TestRun) => {
    diagLog(text);

    for (const projPath in this.channels) {
      this.channels[projPath].appendLine(text);
    }

    if (run)
      run.appendOutput(text + "\r\n");
  };


  logInfo = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[projUri.path].appendLine(text);
    if (run)
      run.appendOutput(text + "\r\n");
  };

  // log info without a line feed (used for logging behave output)
  logInfoNoLF = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text);

    this.channels[projUri.path].append(text);
    if (run)
      run.appendOutput(text);
  };

  // used by settings.ts 
  logSettingsWarning = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    diagLog(text, projUri, DiagLogType.warn);

    this.channels[projUri.path].appendLine(text);
    this.channels[projUri.path].show(true);

    if (run)
      run.appendOutput(text + "\r\n");
  };


  showWarn = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    this._show(text, projUri, run, DiagLogType.warn);
  }


  showError = (error: unknown, projUri?: vscode.Uri | undefined, run?: vscode.TestRun) => {

    let text: string;

    if (error instanceof Error) {
      text = error.message;
      if (error.stack && config && config.instanceSettings && config.instanceSettings.xRay)
        text += `\n${error.stack.split("\n").slice(1).join("\n")}`;
    }
    else {
      text = `${error}`;
    }

    this._show(text, projUri, run, DiagLogType.error);
  }


  private _show = (text: string, projUri: vscode.Uri | undefined, run: vscode.TestRun | undefined, logType: DiagLogType) => {

    diagLog(text, projUri, logType);

    if (projUri) {
      this.channels[projUri.path].appendLine(text);
    }
    else {
      for (const projPath in this.channels) {
        this.channels[projPath].appendLine(text);
      }
    }

    if (config.exampleProject && !text.includes("Canceled") && !text.includes("Cancelled")) {
      debugger; // eslint-disable-line no-debugger
    }


    let winText = text;
    if (projUri) {
      // note - don't use config.workspaceSettings here (possible inifinite loop)
      const wskpFolder = vscode.workspace.getWorkspaceFolder(projUri);
      if (wskpFolder) {
        const projName = wskpFolder?.name;
        winText = `${projName} project: ${text}`;
      }
    }

    if (winText.length > 512)
      winText = text.substring(0, 512) + "...";

    switch (logType) {
      case DiagLogType.info:
        vscode.window.showInformationMessage(winText);
        break;
      case DiagLogType.warn:
        vscode.window.showWarningMessage(winText, "OK");
        break;
      case DiagLogType.error:
        vscode.window.showErrorMessage(winText, "OK");
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

export const diagLog = (message: string, projUri?: vscode.Uri, logType?: DiagLogType) => {
  if (config && !config.instanceSettings.xRay && !config.integrationTestRun && !config.exampleProject)
    return;

  if (projUri)
    message = `${projUri}: ${message}`;

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