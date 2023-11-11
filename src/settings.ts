import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  BEHAVE_CONFIG_FILES,
  findFilesSync,
  findLongestCommonPaths,
  getProjectRelativeConfigPaths,
  getProjectRelativeFeaturePaths,
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder, normalise_relative_path, uriId, WkspError
} from './common';
import { config } from './configuration';
import { Logger } from './logger';



export class RunProfile {
  envVarOverrides?: { [key: string]: string } = {};
  tagExpression?= "";

  constructor(
    envVarOverrides: { [key: string]: string } = {},
    tagExpression = ""
  ) {
    this.envVarOverrides = envVarOverrides;
    this.tagExpression = tagExpression;
  }
}
export type RunProfilesSetting = { [key: string]: RunProfile };

export type StepLibrary = {
  relativePath: string;
  stepFilesRx: string;
}

export type StepLibrariesSetting = StepLibrary[];




export class InstanceSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootRunWorkspacesInParallel: boolean;
  public readonly runProfiles: RunProfilesSetting | undefined;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    const xRayCfg: boolean | undefined = winConfig.get("xRay");
    if (xRayCfg === undefined)
      throw "xRay is undefined";

    this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallelCfg;
    this.xRay = xRayCfg;

    try {
      const runProfilesCfg: RunProfilesSetting | undefined = winConfig.get("runProfiles");
      if (runProfilesCfg === undefined)
        throw "runProfiles is undefined";
      this.runProfiles = runProfilesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.runProfiles" setting was ignored.', "OK");
    }

  }
}

export class WorkspaceFolderSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace folder

  // user-settable
  public readonly envVarOverrides: { [name: string]: string } = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly stepLibraries: StepLibrariesSetting = [];
  // calculated
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly projectRelativeBaseDirPath: string = "";
  public readonly projectRelativeConfigPaths: string[] = [];
  public readonly projectRelativeAdditionalStepsPaths: string[] = [];
  public readonly projectRelativeFeaturePaths: string[] = [];
  // internal
  private readonly _fatalErrors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings, logger: Logger) {

    this.uri = wkspUri;
    this.id = uriId(wkspUri);
    const wsFolder = getWorkspaceFolder(wkspUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const featuresPathCfg: string | undefined = wkspConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = wkspConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = wkspConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";

    try {
      const envVarOverridesCfg: { [name: string]: string } | undefined = wkspConfig.get("envVarOverrides");
      if (envVarOverridesCfg === undefined)
        throw "envVarOverrides is undefined";
      this.envVarOverrides = envVarOverridesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    try {
      const stepLibrariesCfg: StepLibrariesSetting | undefined = wkspConfig.get("stepLibraries");
      if (stepLibrariesCfg === undefined)
        throw "stepLibraries is undefined";
      for (const stepLibrary of stepLibrariesCfg) {
        const stepLib = stepLibrary;
        stepLib.relativePath = stepLibrary.relativePath.replace(/\\/g, "/");
        stepLib.stepFilesRx = stepLibrary.stepFilesRx.replace(/\\/g, "/");
      }

      this.stepLibraries = stepLibrariesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.stepLibraries" setting was ignored.', "OK");
    }

    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;

    this.projectRelativeConfigPaths = getProjectRelativeConfigPaths(this.uri);

    // base dir is a concept borrowed from behave's source code
    // note that it is used to calculate junit filenames (see getJunitFeatureName in junitParser.ts)    
    const baseDirPath = this._getRelativeBaseDirPath(this, this.projectRelativeConfigPaths, logger);
    if (baseDirPath === null) {
      // e.g. an empty workspace folder
      return;
    }

    this.projectRelativeBaseDirPath = baseDirPath;
    if (!this.projectRelativeConfigPaths.includes(baseDirPath))
      this.projectRelativeConfigPaths.push(baseDirPath);

    this.projectRelativeFeaturePaths = getProjectRelativeFeaturePaths(this.uri, this.projectRelativeConfigPaths);

    if (!this.projectRelativeFeaturePaths.includes(this.projectRelativeBaseDirPath)) {
      // (doesn't matter if this path exists or not)
      this.projectRelativeAdditionalStepsPaths.push(path.join(this.projectRelativeBaseDirPath, "steps"));
    }

    this.projectRelativeAdditionalStepsPaths.push(...this._getStepLibraryStepPaths(this.stepLibraries, logger, wkspUri));

    this._logSettings(logger, winSettings);
  }


  private _getRelativeBaseDirPath(wkspSettings: WorkspaceFolderSettings, relativeConfigPaths: string[], logger: Logger): string | null {
    // NOTE: this function MUST have basically the same logic as the 
    // behave source code function "setup_paths()".
    // if that function changes in behave, then it is likely this will also have to change.  
    let base_dir;

    if (relativeConfigPaths.length > 0)
      base_dir = relativeConfigPaths[0];
    else
      base_dir = "features";


    const project_parent_dir = path.dirname(wkspSettings.uri.fsPath);
    let new_base_dir = path.join(wkspSettings.uri.fsPath, base_dir);
    const steps_dir = "steps";
    const environment_file = "environment.py";


    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (fs.existsSync(path.join(new_base_dir, steps_dir)))
        break;
      if (fs.existsSync(path.join(new_base_dir, environment_file)))
        break;
      if (new_base_dir === project_parent_dir)
        break;

      new_base_dir = path.dirname(new_base_dir);
    }

    if (new_base_dir === project_parent_dir) {
      if (relativeConfigPaths.length > 0) {
        logger.showWarn(`Could not find "${steps_dir}" directory. Please specify "paths" in your behave configuration.`,
          wkspSettings.uri);
      }
      return null;
    }

    return path.relative(wkspSettings.uri.fsPath, new_base_dir);
  }


  private _getStepLibraryStepPaths(requestedStepLibraries: StepLibrariesSetting, logger: Logger, wkspUri: vscode.Uri): string[] {

    const stepLibraryPaths: string[] = [];

    for (const stepLibrary of requestedStepLibraries) {
      const relativePath = normalise_relative_path(stepLibrary.relativePath);
      const stepFilesRx = stepLibrary.stepFilesRx;

      if (!relativePath) {
        // the path is required as it is used to set the watcher path
        logger.showWarn('step library path specified in "behave-vsc.stepLibraries" cannot be an empty ' +
          'string and will be ignored', this.uri);
        continue;
      }

      // add some basic, imperfect checks to try and ensure we don't end up with 2+ watchers on the same folder
      const rxPath = relativePath + "/" + stepFilesRx;
      const lowerRelativePath = relativePath.toLowerCase();
      let rxMatch = false;
      for (const relStepSearchPath of this.projectRelativeAdditionalStepsPaths) {
        if (RegExp(rxPath).test(relStepSearchPath)) {
          rxMatch = true;
          break;
        }
      }
      if (rxMatch
        || this.projectRelativeAdditionalStepsPaths.includes(relativePath)
        // check standard paths even if they are not currently in use    
        || lowerRelativePath === "features" || lowerRelativePath === "steps" || lowerRelativePath === "features/steps") {
        logger.showWarn(`step library path "${relativePath}" specified in "behave-vsc.stepLibraries" will be ignored ` +
          "because it is a known steps path).", this.uri);
        continue;
      }

      const folderUri = vscode.Uri.joinPath(wkspUri, relativePath);
      if (!fs.existsSync(folderUri.fsPath)) {
        logger.showWarn(`step library path "${folderUri.fsPath}" specified in "behave-vsc.stepLibraries" not found ` +
          `and will be ignored`, this.uri);
      }
      else {
        stepLibraryPaths.push(relativePath);
      }
    }

    return stepLibraryPaths;
  }


  private _logSettings(logger: Logger, winSettings: InstanceSettings) {

    // build sorted output dict of window settings
    const nonUserSettableWinSettings: string[] = [];
    const winSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettableWinSettings.includes(key)) {
        winSettingsDic[key] = value;
      }
    });

    // build sorted output dict of workspace settings
    const nonUserSettableWkspSettings = ["name", "uri", "id", "featuresUri", "baseUri", "workspaceRelativeStepsSearchPath"];
    const rscSettingsDic: { [name: string]: string; } = {};
    let wkspEntries = Object.entries(this).sort();
    wkspEntries.push(["featuresPaths", this.projectRelativeFeaturePaths]);
    wkspEntries.push(["junitTempPath", config.extensionTempFilesUri.fsPath]);
    wkspEntries = wkspEntries.filter(([key]) => !key.startsWith("_") && !nonUserSettableWkspSettings.includes(key) && key !== "workspaceRelativeFeaturesPath");
    wkspEntries.push(["featuresPath", this.projectRelativeFeaturePaths]);
    wkspEntries = wkspEntries.sort();
    wkspEntries.forEach(([key, value]) => {
      const name = key === "workspaceRelativeFeaturesPath" ? "featuresPath" : key;
      rscSettingsDic[name] = value;
    });


    // output settings, and any warnings or errors for settings

    const wkspUris = getUrisOfWkspFoldersWithFeatures();
    if (wkspUris.length > 0 && this.uri === wkspUris[0])
      logger.logInfoAllWksps(`\ninstance settings:\n${JSON.stringify(winSettingsDic, null, 2)}`);

    logger.logInfo(`\n${this.name} workspace settings:\n${JSON.stringify(rscSettingsDic, null, 2)}`, this.uri);

    if (this._fatalErrors.length > 0) {
      throw new WkspError(`\nFATAL ERROR due to invalid setting in "${this.name}/.vscode/settings.json". Extension cannot continue. ` +
        `${this._fatalErrors.join("\n")}\n` +
        `NOTE: fatal errors may require you to restart vscode after correcting the problem.) `, this.uri);
    }
  }

}



