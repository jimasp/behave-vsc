import * as os from 'os';
import * as vscode from 'vscode';
import { Logger } from './Logger';
import { WorkspaceSettings } from './WorkspaceSettings';

export const EXTENSION_NAME = "behave-vsc";
export const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
export const EXTENSION_FRIENDLY_NAME = "Behave VSC";
export const MSPY_EXT = "ms-python.python";
export const ERR_HIGHLIGHT = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";


export interface ExtensionConfiguration {
  readonly tempFilesUri: vscode.Uri;
  readonly logger: Logger;
  getWorkspaceSettings(wkspUri: vscode.Uri): WorkspaceSettings;
  reloadWorkspaceSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
  public readonly tempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), EXTENSION_NAME);
  public readonly logger: Logger = new Logger();
  private static _workspaceSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

  private static _configuration?: Configuration;

  private constructor() {
    Configuration._configuration = this;
    console.log("Configuration singleton constructed (this should only fire once except for test runs)");
  }

  static get configuration() {
    if (Configuration._configuration)
      return Configuration._configuration;

    Configuration._configuration = new Configuration();
    return Configuration._configuration;
  }

  // called by onDidChangeConfiguration
  public reloadWorkspaceSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined = undefined) {
    this.logger.clear();
    this.logger.logInfo("Settings change detected.");

    if (!testConfig)
      Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
    else
      Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, this.logger);
  }

  public getWorkspaceSettings(wkspUri: vscode.Uri) {
    return Configuration._workspaceSettings[wkspUri.path]
      ? Configuration._workspaceSettings[wkspUri.path]
      : Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
  }

  // note - this can be changed dynamically by the user, so don't store the result
  public getPythonExec = async (wkspUri: vscode.Uri): Promise<string> => {
    return await getPythonExecutable(this.logger, wkspUri);
  }

}


const getPythonExecutable = async (logger: Logger, scope: vscode.Uri) => {

  const pyext = vscode.extensions.getExtension(MSPY_EXT);


  if (!pyext) {
    const msg = EXTENSION_FRIENDLY_NAME + " could not find required dependency " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  if (!pyext.isActive) {
    await pyext?.activate();
    if (!pyext.isActive) {
      const msg = EXTENSION_FRIENDLY_NAME + " could not activate required dependency " + MSPY_EXT;
      vscode.window.showErrorMessage(msg);
      logger.logError(msg);
      return undefined;
    }
  }

  const pythonExec = await pyext?.exports.settings.getExecutionDetails(scope).execCommand[0];
  if (!pythonExec) {
    const msg = EXTENSION_FRIENDLY_NAME + " failed to obtain python executable from " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  return pythonExec;
}


export default Configuration.configuration;

