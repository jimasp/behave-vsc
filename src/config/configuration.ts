import * as os from 'os';
import * as vscode from 'vscode';
import { getUrisOfWkspFoldersWithFeatures } from '../common/helpers';
import { ProjectSettings, InstanceSettings } from './settings';
import { services } from '../common/services';


export class Configuration {
  isIntegrationTestRun = false;
  instanceSettingsLoaded = false; // used by xRayLog to check if instanceSettings is available (i.e. without get() side-effects)
  readonly exampleProject: boolean = false;
  readonly extensionTempFilesUri;
  #windowSettings: InstanceSettings | undefined = undefined;
  #resourceSettings: { [projUriPath: string]: ProjectSettings } = {};

  constructor() {
    this.extensionTempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), "behave-vsc");
    this.exampleProject = (vscode.workspace.workspaceFolders?.find(f =>
      f.uri.path.includes("/behave-vsc/example-projects/")) !== undefined);
  }

  // called by onDidChangeConfiguration
  async reloadSettings(projUri: vscode.Uri, testConfig?: vscode.WorkspaceConfiguration) {
    if (testConfig) {
      this.#windowSettings = new InstanceSettings(testConfig);
      this.#resourceSettings[projUri.path] = await ProjectSettings.create(projUri, testConfig, this.#windowSettings);
    }
    else {
      this.#windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
      this.#resourceSettings[projUri.path] = await ProjectSettings.create(projUri,
        vscode.workspace.getConfiguration("behave-vsc", projUri), this.#windowSettings);
    }
  }

  get instanceSettings(): InstanceSettings {
    if (this.#windowSettings)
      return this.#windowSettings;
    this.#windowSettings = new InstanceSettings(vscode.workspace.getConfiguration("behave-vsc"));
    this.instanceSettingsLoaded = true;
    return this.#windowSettings;
  }

  #processing = false;
  async getProjectSettings(projUriPath: string): Promise<ProjectSettings> {
    const winSettings = this.instanceSettings;

    // This is a lazy async get that can be called multiple times in parallel, and 
    // we don't want it to do the same work multiple times if we can avoid it.
    // If the timeout expires, then we will just carry on and do the work again 
    // in the hope it completes, as there's not much else we can do.
    let wait = 0;
    const timeout = 10000;
    while (this.#processing && wait < timeout) {
      await new Promise(resolve => setTimeout(resolve, 20));
      wait += 20;
    }

    try {
      this.#processing = true;
      for (const projUri of getUrisOfWkspFoldersWithFeatures()) {
        // only create the project settings if they are not already loaded
        if (!this.#resourceSettings[projUri.path]) {
          this.#resourceSettings[projUri.path] =
            await ProjectSettings.create(projUri, vscode.workspace.getConfiguration("behave-vsc", projUri), winSettings);
        }
      }
    }
    finally {
      this.#processing = false;
    }
    return this.#resourceSettings[projUriPath];
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

