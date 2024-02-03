import * as os from 'os';
import * as vscode from 'vscode';
import { getUrisOfWkspFoldersWithFeatures } from '../common/helpers';
import { ProjectSettings, InstanceSettings } from './settings';


export class Configuration {
  isIntegrationTestRun = false;
  instanceSettingsLoaded = false; // used by xRayLog to check if instanceSettings is available (i.e. without get() side-effects)
  readonly exampleProject: boolean = false;
  readonly extensionTempFilesUri;
  private _windowSettings: InstanceSettings | undefined = undefined;
  private _resourceSettings: { [projUriPath: string]: ProjectSettings } = {};

  constructor() {
    this.extensionTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), "behave-vsc");
    this.exampleProject = (vscode.workspace.workspaceFolders?.find(f =>
      f.uri.path.includes("/behave-vsc/example-projects/")) !== undefined);
  }

  // called by onDidChangeConfiguration
  async reloadSettings(projUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration) {
    if (testConfig) {
      this._windowSettings = new InstanceSettings(testConfig);
      this._resourceSettings[projUri.path] = await ProjectSettings.create(projUri, testConfig, this._windowSettings);
    }
    else {
      this._windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
      this._resourceSettings[projUri.path] = await ProjectSettings.create(projUri,
        vscode.workspace.getConfiguration("behave-vsc", projUri), this._windowSettings);
    }
  }

  get instanceSettings(): InstanceSettings {
    if (this._windowSettings)
      return this._windowSettings;
    this._windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
    this.instanceSettingsLoaded = true;
    return this._windowSettings;
  }

  async getProjectSettings(projUriPath: string): Promise<ProjectSettings> {
    const winSettings = this.instanceSettings;
    for (const projUri of getUrisOfWkspFoldersWithFeatures()) {
      if (!this._resourceSettings[projUri.path]) {
        this._resourceSettings[projUri.path] =
          await ProjectSettings.create(projUri, vscode.workspace.getConfiguration("behave-vsc", projUri), winSettings);
      }
    }
    return this._resourceSettings[projUriPath];
  }

  // note - python interpreter can be changed dynamically by the user, so don't store the result
  getPythonExecutable = async (projUri: vscode.Uri, projName: string) => {
    const msPyExt = "ms-python.python";
    const pyext = vscode.extensions.getExtension(msPyExt);

    if (!pyext)
      throw new Error(`Behave VSC could not find required dependency ${msPyExt}`);

    if (!pyext.isActive) {
      await pyext?.activate();
      if (!pyext.isActive)
        throw new Error(`Behave VSC could not activate required dependency ${msPyExt}`);
    }

    const pythonExec = await pyext?.exports.settings.getExecutionDetails(projUri).execCommand[0];
    if (!pythonExec)
      throw new Error(`Behave VSC failed to obtain python executable for ${projName} workspace from ${msPyExt}`);

    return pythonExec;
  }

}

