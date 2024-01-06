import * as vscode from 'vscode';
import { services } from '../services';
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
    xRayLog(text);

    for (const projPath in this.channels) {
      this.channels[projPath].appendLine(text);
    }

    if (run)
      run.appendOutput(text + "\r\n");
  };


  logInfo = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    xRayLog(text);

    this.channels[projUri.path].appendLine(text);
    if (run)
      run.appendOutput(text + "\r\n");
  };

  // log info without a line feed (used for logging behave output)
  logInfoNoLF = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    xRayLog(text);

    this.channels[projUri.path].append(text);
    if (run)
      run.appendOutput(text);
  };

  // used by settings.ts 
  logSettingsWarning = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    xRayLog(text, projUri, LogType.warn);

    this.channels[projUri.path].appendLine(text);
    this.channels[projUri.path].show(true);

    if (run)
      run.appendOutput(text + "\r\n");
  };


  showWarn = (text: string, projUri: vscode.Uri, run?: vscode.TestRun) => {
    this._show(text, projUri, run, LogType.warn);
  }


  showError = (error: unknown, projUri?: vscode.Uri | undefined, run?: vscode.TestRun) => {
    let text: string;

    if (error instanceof Error) {
      text = error.message;
      if (error.stack && inDiagnosticMode())
        text += `\n${error.stack.split("\n").slice(1).join("\n")}`;
    }
    else {
      text = `${error}`;
    }

    this._show(text, projUri, run, LogType.error);
  }


  private _show = (text: string, projUri: vscode.Uri | undefined, run: vscode.TestRun | undefined, logType: LogType) => {

    xRayLog(text, projUri, logType);

    if (projUri) {
      this.channels[projUri.path].appendLine(text);
    }
    else {
      for (const projPath in this.channels) {
        this.channels[projPath].appendLine(text);
      }
    }

    if (services.config.exampleProject && !text.includes("Canceled") && !text.includes("Cancelled")) {
      debugger; // eslint-disable-line no-debugger
    }


    let winText = text;
    if (projUri) {
      // note - don't use config.projectSettings here (can be an infinite loop as projectSettings is a get() which can itself log)
      const wskpFolder = vscode.workspace.getWorkspaceFolder(projUri);
      if (wskpFolder) {
        const projName = wskpFolder?.name;
        winText = `${projName} project: ${text}`;
      }
    }

    if (winText.length > 512)
      winText = text.substring(0, 512) + "...";

    switch (logType) {
      case LogType.info:
        vscode.window.showInformationMessage(winText);
        break;
      case LogType.warn:
        vscode.window.showWarningMessage(winText, "OK");
        break;
      case LogType.error:
        vscode.window.showErrorMessage(winText, "OK");
        break;
    }

    // if(inDiagnosticMode())
    //   vscode.debug.activeDebugConsole.appendLine(text);
    if (run)
      run.appendOutput(text.replace("\n", "\r\n") + "\r\n");
  }
}

export const xRayLog = (message: string, projUri?: vscode.Uri, logType?: LogType) => {

  // logs to console if in diagnostic mode

  if (!inDiagnosticMode())
    return;

  if (projUri)
    message = `${projUri}: ${message}`;

  message = `[Behave VSC] ${message}`;

  switch (logType) {
    case LogType.error:
      console.error(message);
      break;
    case LogType.warn:
      console.warn(message);
      break;
    default:
      console.log(message);
      break;
  }
}

export enum LogType {
  "info", "warn", "error"
}

function inDiagnosticMode() {
  // diagnostic logs enabled if:
  // - services/config is not yet loaded, or
  // - xRay is enabled by user, or 
  // - we're debugging an example project, or  
  // - we're running integration tests
  if (!services?.config?.instanceSettingsLoaded
    || services.config.instanceSettings.xRay
    || services.config.exampleProject
    || services.config.isIntegrationTestRun) {
    return true;
  }
  return false;
}

