import * as os from 'os';
import * as vscode from 'vscode';
import { getUrisOfWkspFoldersWithFeatures } from './common';
import { diagLog, Logger } from './logger';
import { ProjectSettings as ProjectSettings, InstanceSettings } from './settings';

export interface Configuration {
  integrationTestRun: boolean;
  readonly extensionTempFilesUri: vscode.Uri;
  readonly logger: Logger;
  readonly projectSettings: { [projUriPath: string]: ProjectSettings };
  readonly instanceSettings: InstanceSettings;
  reloadSettings(projUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration): void;
  getPythonExecutable(projUri: vscode.Uri, projName: string): Promise<string>;
  dispose(): void;
}


// don't export this, use the interface
class ExtensionConfiguration implements Configuration {
  public integrationTestRun = false;
  public exampleProject = false;
  public readonly extensionTempFilesUri;
  public readonly logger: Logger;
  private static _configuration?: ExtensionConfiguration;
  private _windowSettings: InstanceSettings | undefined = undefined;
  private _resourceSettings: { [projUriPath: string]: ProjectSettings } = {};

  private constructor() {
    ExtensionConfiguration._configuration = this;
    this.logger = new Logger();
    this.extensionTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), "behave-vsc");
    this.exampleProject = (vscode.workspace.workspaceFolders?.find(f =>
      f.uri.path.includes("/behave-vsc/example-projects/")) !== undefined);
    diagLog("Configuration singleton constructed (this should only fire once)");
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
  public reloadSettings(projUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration) {
    if (testConfig) {
      this._windowSettings = new InstanceSettings(testConfig);
      this._resourceSettings[projUri.path] = new ProjectSettings(projUri, testConfig, this._windowSettings, this.logger);
    }
    else {
      this._windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
      this._resourceSettings[projUri.path] = new ProjectSettings(projUri,
        vscode.workspace.getConfiguration("behave-vsc", projUri), this._windowSettings, this.logger);
    }
  }

  public get instanceSettings(): InstanceSettings {
    return this._windowSettings
      ? this._windowSettings
      : this._windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
  }

  public get projectSettings(): { [projUriPath: string]: ProjectSettings } {
    const winSettings = this.instanceSettings;
    getUrisOfWkspFoldersWithFeatures().forEach(projUri => {
      if (!this._resourceSettings[projUri.path]) {
        this._resourceSettings[projUri.path] =
          new ProjectSettings(projUri, vscode.workspace.getConfiguration("behave-vsc", projUri), winSettings, this.logger);
      }
    });
    return this._resourceSettings;
  }

  // note - python interpreter can be changed dynamically by the user, so don't store the result
  getPythonExecutable = async (projUri: vscode.Uri, projName: string) => {
    const msPyExt = "ms-python.python";
    const pyext = vscode.extensions.getExtension(msPyExt);

    if (!pyext)
      throw (`Behave VSC could not find required dependency ${msPyExt}`);

    if (!pyext.isActive) {
      await pyext?.activate();
      if (!pyext.isActive)
        throw (`Behave VSC could not activate required dependency ${msPyExt}`);
    }

    const pythonExec = await pyext?.exports.settings.getExecutionDetails(projUri).execCommand[0];
    if (!pythonExec)
      throw (`Behave VSC failed to obtain python executable for ${projName} workspace from ${msPyExt}`);

    return pythonExec;
  }

}



// global = stop the constructor getting called twice in extension integration tests
declare const global: any; // eslint-disable-line @typescript-eslint/no-explicit-any
if (!global.config)
  global.config = ExtensionConfiguration.configuration;
export const config: ExtensionConfiguration = global.config;
