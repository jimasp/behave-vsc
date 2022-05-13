import * as os from 'os';
import * as vscode from 'vscode';
import { getWorkspaceFolderUris } from './helpers';
import { Logger } from './Logger';
import { WorkspaceSettings, WindowSettings } from './WorkspaceSettings';

export const EXTENSION_NAME = "behave-vsc";
export const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
export const EXTENSION_FRIENDLY_NAME = "Behave VSC";
export const MSPY_EXT = "ms-python.python";
export const ERR_HIGHLIGHT = "\x1b \x1b \x1b \x1b";
export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952

declare global {
  // eslint-disable-next-line no-var
  var config: Configuration;
}


export interface Configuration {
  integrationTestRunAll: boolean;
  readonly extTempFilesUri: vscode.Uri;
  readonly logger: Logger;
  getWorkspaceSettings(wkspUri: vscode.Uri): WorkspaceSettings;
  getWindowSettings(): WindowSettings;
  reloadSettings(wkspUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
  resyncLoggerToWorkspaces(): void;
  dispose(): void;
}


// don't export this, use the interface
class ExtensionConfiguration implements Configuration {
  public integrationTestRunAll = false;
  public readonly extTempFilesUri;
  public logger: Logger;
  private static _configuration?: ExtensionConfiguration;
  private windowSettings: WindowSettings | undefined = undefined;
  private resourceSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

  private constructor() {
    ExtensionConfiguration._configuration = this;
    this.logger = new Logger(getWorkspaceFolderUris());
    this.extTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), EXTENSION_NAME);
    console.log("Configuration singleton constructed (this should only fire once)");
  }

  public dispose() {
    this.logger.dispose();
  }

  public resyncLoggerToWorkspaces() {
    this.logger.dispose();
    this.logger = new Logger(getWorkspaceFolderUris());
  }


  static get configuration() {
    if (ExtensionConfiguration._configuration)
      return ExtensionConfiguration._configuration;

    ExtensionConfiguration._configuration = new ExtensionConfiguration();
    return ExtensionConfiguration._configuration;
  }

  // called by onDidChangeConfiguration
  public reloadSettings(wkspUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration) {

    if (testConfig) {
      this.windowSettings = new WindowSettings(testConfig);
      this.resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, this.windowSettings, this.logger);
    }
    else {
      this.windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
      this.resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri,
        vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.windowSettings, this.logger);
    }
  }

  public getWorkspaceSettings(wkspUri: vscode.Uri) {
    const _windowSettings = this.getWindowSettings();
    return this.resourceSettings[wkspUri.path]
      ? this.resourceSettings[wkspUri.path]
      : this.resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri,
        vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), _windowSettings, this.logger);
  }

  public getWindowSettings() {
    return this.windowSettings
      ? this.windowSettings
      : this.windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
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


global.config = ExtensionConfiguration.configuration;
export default global.config;