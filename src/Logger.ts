import * as vscode from 'vscode';
import { EXTENSION_FRIENDLY_NAME, ERR_HIGHLIGHT } from './Configuration';


export function cleanBehaveText(text: string) {
  return text.replaceAll("\x1b", "").replaceAll("[33m", "").replaceAll("[0m", "");
}


export class Logger {

  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
  public run: vscode.TestRun | undefined = undefined;

  show = () => {
    this.outputChannel.show();
  };

  clear = () => {
    this.outputChannel.clear();
  };

  logInfo = (text: string) => {
    text = cleanBehaveText(text);
    console.log(text);
    this.outputChannel.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  };

  logWarn = (text: string) => {
    console.log(text);
    this.outputChannel.appendLine(text);
    this.outputChannel.show(true);
    if (this.run)
      this.run?.appendOutput(text);
  };

  logError = (msgOrError: unknown, prependMsg = "") => {

    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);
    if (prependMsg)
      text = `${prependMsg}\n${text}`;
    text = cleanBehaveText(text);

    console.error(text);
    this.outputChannel.appendLine("\n" + ERR_HIGHLIGHT);
    this.outputChannel.appendLine(text);
    this.outputChannel.appendLine(ERR_HIGHLIGHT);
    this.outputChannel.show(true);
    vscode.debug.activeDebugConsole.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  };
}
