import * as os from 'os';
import * as vscode from 'vscode';
import { getUrisOfWkspFoldersWithFeatures } from './common';
import { Logger } from './Logger';
import { WorkspaceSettings as WorkspaceSettings, WindowSettings } from './settings';

export const EXTENSION_NAME = "behave-vsc";
export const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
export const EXTENSION_FRIENDLY_NAME = "Behave VSC";
export const MSPY_EXT = "ms-python.python";
export const ERR_HIGHLIGHT = "\x1b \x1b \x1b \x1b";
export const WIN_MAX_PATH = 259; // 256 + 3 for "C:\", see https://superuser.com/a/1620952



export interface Configuration {
  integrationTestRun: boolean;
  readonly extTempFilesUri: vscode.Uri;
  readonly logger: Logger;
  readonly workspaceSettings: { [wkspUriPath: string]: WorkspaceSettings };
  readonly globalSettings: WindowSettings;
  reloadSettings(wkspUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
  dispose(): void;
}


// don't export this, use the interface
class ExtensionConfiguration implements Configuration {
  public integrationTestRun = false;
  public readonly extTempFilesUri;
  public readonly logger: Logger;
  private static _configuration?: ExtensionConfiguration;
  private _windowSettings: WindowSettings | undefined = undefined;
  private _resourceSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

  private constructor() {
    ExtensionConfiguration._configuration = this;
    this.logger = new Logger();
    this.extTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), EXTENSION_NAME);
    console.log("Configuration singleton constructed (this should only fire once)");
  }

  public dispose() {
    this.logger.dispose();
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
      this._windowSettings = new WindowSettings(testConfig);
      this._resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, this._windowSettings, this.logger);
    }
    else {
      this._windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
      this._resourceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri,
        vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this._windowSettings, this.logger);
    }
  }

  public get globalSettings(): WindowSettings {
    return this._windowSettings
      ? this._windowSettings
      : this._windowSettings = new WindowSettings(vscode.workspace.getConfiguration(EXTENSION_NAME));
  }

  public get workspaceSettings(): { [wkspUriPath: string]: WorkspaceSettings } {
    const winSettings = this.globalSettings;
    getUrisOfWkspFoldersWithFeatures().forEach(wkspUri => {
      if (!this._resourceSettings[wkspUri.path]) {
        this._resourceSettings[wkspUri.path] =
          new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), winSettings, this.logger);
      }
    })
    return this._resourceSettings;
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


// global = stop the constructor getting called twice in extension integration tests

declare const global: any; // eslint-disable-line @typescript-eslint/no-explicit-any
if (!global.config)
  global.config = ExtensionConfiguration.configuration;
export const config: ExtensionConfiguration = global.config;
