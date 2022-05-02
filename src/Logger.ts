import * as vscode from 'vscode';
import { EXTENSION_FRIENDLY_NAME, ERR_HIGHLIGHT } from './Configuration';


export function cleanBehaveText(text: string) {
  return text.replaceAll("\x1b", "").replaceAll("[33m", "").replaceAll("[0m", "");
}


export class Logger {

  private channels: { [wkspUri: string]: vscode.OutputChannel } = {};
  public run: vscode.TestRun | undefined = undefined;
  public visible = false;

  constructor(workspaceUris: vscode.Uri[]) {

    // if (workspaceUris.length < 2) {
    //   this.defaultChannel = this.channels[""] = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
    //   return;
    // }

    workspaceUris.forEach(wkspUri => {
      const name = wkspUri.path.split("/").pop();
      if (!name)
        throw new Error("can't get workspace name from uri path");
      this.channels[wkspUri.path] = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME + ": " + name);
    });
  }

  dispose() {
    for (const name in this.channels) {
      this.channels[name].dispose();
    }
  }

  show = (wkspUri?: vscode.Uri) => {
    if (!wkspUri) {
      for (const wkspPath in this.channels) {
        this.channels[wkspPath].show();
      }
      return;
    }
    this.channels[wkspUri.path].show();
  };

  clear = (wkspUri?: vscode.Uri) => {
    if (!wkspUri) {
      for (const wkspUri in this.channels) {
        this.channels[wkspUri].clear();
      }
      return;
    }
    this.channels[wkspUri.path].clear();
  };

  logInfo = (text: string, wkspUri?: vscode.Uri) => {
    text = cleanBehaveText(text);
    console.log(text);

    if (!wkspUri) {
      for (const wkspPath in this.channels) {
        this.channels[wkspPath].appendLine(text);
      }
      return;
    }
    else {
      this.channels[wkspUri.path].appendLine(text);
    }
    if (this.run)
      this.run?.appendOutput(text);
  };

  logWarn = (text: string, wkspUri?: vscode.Uri) => {
    console.log(text);

    if (!wkspUri) {
      for (const wkspUri in this.channels) {
        this.channels[wkspUri].appendLine(text);
        this.channels[wkspUri].show(true);
      }
    }
    else {
      this.channels[wkspUri.path].appendLine(text);
      this.channels[wkspUri.path].show(true);
    }

    if (this.run)
      this.run?.appendOutput(text);
  };

  logError = (msgOrError: unknown, wkspUri?: vscode.Uri, prependMsg = "") => {
    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);

    if (prependMsg)
      text = `${prependMsg}\n${text}`;
    text = cleanBehaveText(text);

    console.error(text);

    if (!wkspUri) {
      for (const wkspPath in this.channels) {
        this.channels[wkspPath].appendLine("\n" + ERR_HIGHLIGHT);
        this.channels[wkspPath].appendLine(text);
        this.channels[wkspPath].appendLine(ERR_HIGHLIGHT);
        this.channels[wkspPath].show(true);
      }
    }
    else {
      this.channels[wkspUri.path].appendLine("\n" + ERR_HIGHLIGHT);
      this.channels[wkspUri.path].appendLine(text);
      this.channels[wkspUri.path].appendLine(ERR_HIGHLIGHT);
      this.channels[wkspUri.path].show(true);
    }

    vscode.debug.activeDebugConsole.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  };
}
