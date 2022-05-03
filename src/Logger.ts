import * as vscode from 'vscode';
import { EXTENSION_FRIENDLY_NAME, ERR_HIGHLIGHT } from './Configuration';


export function cleanBehaveText(text: string) {
  return text.replaceAll("\x1b", "").replaceAll("[33m", "").replaceAll("[0m", "");
}


export class Logger {

  private channels: { [wkspUri: string]: vscode.OutputChannel } = {};
  public visible = false;

  constructor(wkspUris: vscode.Uri[]) {

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

  // log without a carriage return, used for behave output
  logInfoNoCR = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    text = cleanBehaveText(text);
    console.log(text);

    this.channels[wkspUri.path].append(text);
    if (run)
      run.appendOutput(text);
  };

  logInfo = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    text = cleanBehaveText(text);
    console.log(text);

    this.channels[wkspUri.path].appendLine(text);
    if (run)
      run.appendOutput(text + "\n");
  };

  logInfoAllWksps = (text: string, run?: vscode.TestRun) => {
    text = cleanBehaveText(text);
    console.log(text);

    for (const wkspPath in this.channels) {
      this.channels[wkspPath].appendLine(text);
    }

    if (run)
      run.appendOutput(text + "\n");
  };

  logWarn = (text: string, wkspUri: vscode.Uri, run?: vscode.TestRun) => {
    text = cleanBehaveText(text);
    console.warn(text);

    this.channels[wkspUri.path].appendLine(text);
    this.channels[wkspUri.path].show(true);

    if (run)
      run.appendOutput(text + "\n");
  };

  logWarnAllWksps = (text: string, run?: vscode.TestRun) => {
    text = cleanBehaveText(text);
    console.warn(text);

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

  logError = (msgOrError: unknown, wkspUri: vscode.Uri, prependMsg = "", run?: vscode.TestRun) => {
    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);
    text = cleanBehaveText(text);
    if (prependMsg)
      text = `${prependMsg}\n${text}`;
    console.error(text);

    this.channels[wkspUri.path].appendLine("\n" + ERR_HIGHLIGHT);
    this.channels[wkspUri.path].appendLine(text);
    this.channels[wkspUri.path].appendLine(ERR_HIGHLIGHT);
    this.channels[wkspUri.path].show(true);

    vscode.debug.activeDebugConsole.appendLine(text);
    if (run)
      run.appendOutput(text + "\n");
  }

  logErrorAllWksps = (msgOrError: unknown, prependMsg = "", run?: vscode.TestRun) => {
    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);
    text = cleanBehaveText(text);
    if (prependMsg)
      text = `${prependMsg}\n${text}`;
    console.error(text);


    for (const wkspPath in this.channels) {
      this.channels[wkspPath].appendLine("\n" + ERR_HIGHLIGHT);
      this.channels[wkspPath].appendLine(text);
      this.channels[wkspPath].appendLine(ERR_HIGHLIGHT);
      this.channels[wkspPath].show(true);
    }

    vscode.debug.activeDebugConsole.appendLine(text);
    if (run)
      run.appendOutput(text + "\n");
  }

}

