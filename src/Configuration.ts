import * as os from 'os';
import * as vscode from 'vscode';
import { getWorkspaceFolderUris } from './helpers';
import { Logger } from './Logger';
import { WorkspaceSettings, WindowSettings } from './WorkspaceSettings';

export const EXTENSION_NAME = "behave-vsc";
export const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
export const EXTENSION_FRIENDLY_NAME = "Behave VSC";
export const MSPY_EXT = "ms-python.python";
export const ERR_HIGHLIGHT = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";
export const WIN_MAX_PATH = 260;


export interface ExtensionConfiguration {
  readonly extTempFilesUri: vscode.Uri;
  readonly logger: Logger;
  getWorkspaceSettings(wkspUri: vscode.Uri): WorkspaceSettings;
  getWindowSettings(): WindowSettings;
  reloadSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
  public readonly extTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), EXTENSION_NAME);
  public logger: Logger = new Logger(getWorkspaceFolderUris());
  private static _windowSettings: WindowSettings | undefined = undefined;
  private static _resourceSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

  private static _configuration?: Configuration;


  private constructor() {
    Configuration._configuration = this;
    console.log("Configuration singleton constructed (this should only fire once except for test runs)");
  }

  public dispose() {
    this.logger.dispose();
  }

  static get configuration() {
    if (Configuration._configuration)
      return Configuration._configuration;

    Configuration._configuration = new Configuration();
    return Configuration._configuration;
  }

  // called by onDidChangeConfiguration
  public async reloadSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined = undefined) {

    if (testConfig) {
      Configuration._windowSettings = new WindowSettings(testConfig);
      Configuration._resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, Configuration._windowSettings, this.logger);
    }
    else {
      Configuration._windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
      Configuration._resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri,
        vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), Configuration._windowSettings, this.logger);
    }
  }

  public getWorkspaceSettings(wkspUri: vscode.Uri) {
    const _windowSettings = this.getWindowSettings();
    return Configuration._resourceSettings[wkspUri.path]
      ? Configuration._resourceSettings[wkspUri.path]
      : Configuration._resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri,
        vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), _windowSettings, this.logger);
  }

  public getWindowSettings() {
    return Configuration._windowSettings
      ? Configuration._windowSettings
      : Configuration._windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
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
    logger.logErrorAllWksps(msg);
    return undefined;
  }

  if (!pyext.isActive) {
    await pyext?.activate();
    if (!pyext.isActive) {
      const msg = EXTENSION_FRIENDLY_NAME + " could not activate required dependency " + MSPY_EXT;
      vscode.window.showErrorMessage(msg);
      logger.logErrorAllWksps(msg);
      return undefined;
    }
  }

  const pythonExec = await pyext?.exports.settings.getExecutionDetails(scope).execCommand[0];
  if (!pythonExec) {
    const msg = EXTENSION_FRIENDLY_NAME + " failed to obtain python executable from " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logErrorAllWksps(msg);
    return undefined;
  }

  return pythonExec;
}


export default Configuration.configuration;


