import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getProjectRelativeConfigPaths,
  getProjectRelativeFeaturePaths,
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder,
  normaliseUserSuppliedRelativePath,
  uriId,
  projError
} from './common';
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
  // class for package.json scope:"window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json OR *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootRunProjectsInParallel: boolean;
  public readonly runProfiles: RunProfilesSetting | undefined;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings

    // deprecated setting
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    // ------------------

    const multiRootRunProjectsInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunProjectsInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";

    if (!multiRootRunWorkspacesInParallelCfg || !multiRootRunProjectsInParallelCfg)
      this.multiRootRunProjectsInParallel = false;
    else
      this.multiRootRunProjectsInParallel = true;

    const xRayCfg: boolean | undefined = winConfig.get("xRay");
    if (xRayCfg === undefined)
      throw "xRay is undefined";
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

export class ProjectSettings {
  // class for package.json scope:"resource" settings in settings.json
  // these apply to a specific workspace root folder

  // user-settable
  public readonly envVarOverrides: { [name: string]: string } = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly stepLibraries: StepLibrariesSetting = [];
  // calculated
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly relativeBaseDirPath: string = "";
  public readonly relativeConfigPaths: string[] = [];
  public readonly relativeFeaturePaths: string[] = [];
  public readonly relativeStepsPathsOutsideFeaturePaths: string[] = [];
  // internal
  private readonly _fatalErrors: string[] = [];


  constructor(projUri: vscode.Uri, projConfig: vscode.WorkspaceConfiguration, winSettings: InstanceSettings, logger: Logger) {

    this.uri = projUri;
    this.id = uriId(projUri);
    const wsFolder = getWorkspaceFolder(projUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const featuresPathCfg: string | undefined = projConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = projConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = projConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";

    try {
      const envVarOverridesCfg: { [name: string]: string } | undefined = projConfig.get("envVarOverrides");
      if (envVarOverridesCfg === undefined)
        throw "envVarOverrides is undefined";
      this.envVarOverrides = envVarOverridesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    try {
      const stepLibrariesCfg: StepLibrariesSetting | undefined = projConfig.get("stepLibraries");
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

    this.relativeConfigPaths = getProjectRelativeConfigPaths(this.uri);

    // base dir is a concept borrowed from behave's source code
    // note that it is used to calculate junit filenames (see getJunitFeatureName in junitParser.ts)    
    const baseDirPath = this._getRelativeBaseDirPath(this, this.relativeConfigPaths, logger);
    if (baseDirPath === null) {
      // e.g. an empty workspace folder
      return;
    }

    this.relativeBaseDirPath = baseDirPath;
    if (!this.relativeConfigPaths.includes(baseDirPath))
      this.relativeConfigPaths.push(baseDirPath);

    this.relativeFeaturePaths = getProjectRelativeFeaturePaths(this.uri, this.relativeConfigPaths);

    if (!this.relativeFeaturePaths.includes(this.relativeBaseDirPath)) {
      // (doesn't matter if this path exists or not)
      this.relativeStepsPathsOutsideFeaturePaths.push(path.join(this.relativeBaseDirPath, "steps"));
    }

    this.relativeStepsPathsOutsideFeaturePaths.push(...this._getStepLibraryStepPaths(this.stepLibraries, logger, projUri));

    this._logSettings(logger, winSettings);
  }


  private _getRelativeBaseDirPath(projSettings: ProjectSettings, relativeConfigPaths: string[], logger: Logger): string | null {
    // NOTE: this function MUST have basically the same logic as the 
    // behave source code function "setup_paths()".
    // if that function changes in behave, then it is likely this will also have to change.  
    let base_dir;

    if (relativeConfigPaths.length > 0)
      base_dir = relativeConfigPaths[0];
    else
      base_dir = "features";


    const project_parent_dir = path.dirname(projSettings.uri.fsPath);
    let new_base_dir = path.join(projSettings.uri.fsPath, base_dir);
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
          projSettings.uri);
      }
      return null;
    }

    return path.relative(projSettings.uri.fsPath, new_base_dir);
  }


  private _getStepLibraryStepPaths(requestedStepLibraries: StepLibrariesSetting, logger: Logger, projUri: vscode.Uri): string[] {

    const stepLibraryPaths: string[] = [];

    for (const stepLibrary of requestedStepLibraries) {
      const relativePath = normaliseUserSuppliedRelativePath(stepLibrary.relativePath);
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
      for (const relStepSearchPath of this.relativeStepsPathsOutsideFeaturePaths) {
        if (RegExp(rxPath).test(relStepSearchPath)) {
          rxMatch = true;
          break;
        }
      }
      if (rxMatch
        || this.relativeStepsPathsOutsideFeaturePaths.includes(relativePath)
        // check standard paths even if they are not currently in use    
        || lowerRelativePath === "features" || lowerRelativePath === "steps" || lowerRelativePath === "features/steps") {
        logger.showWarn(`step library path "${relativePath}" specified in "behave-vsc.stepLibraries" will be ignored ` +
          "because it is a known steps path).", this.uri);
        continue;
      }

      const folderUri = vscode.Uri.joinPath(projUri, relativePath);
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
    const windowSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettableWinSettings.includes(key)) {
        windowSettingsDic[key] = value;
      }
    });

    // build sorted output dict of resource settings
    const filterprojSettings = ["envVarOverrides", "justMyCode", "runParallel", "stepLibraries"];
    let projEntries = Object.entries(this).sort();
    projEntries = projEntries.filter(([key]) => filterprojSettings.includes(key));
    projEntries = projEntries.sort();
    const resourceSettingsDic: { [name: string]: string; } = {};
    projEntries.forEach(([key, value]) => {
      resourceSettingsDic[key] = value;
    });

    // output settings, and any warnings or errors for settings

    const projUris = getUrisOfWkspFoldersWithFeatures();
    if (projUris.length > 0 && this.uri === projUris[0])
      logger.logInfoAllProjects(`\ninstance settings:\n${JSON.stringify(windowSettingsDic, null, 2)}`);

    logger.logInfo(`\n${this.name} workspace settings:\n${JSON.stringify(resourceSettingsDic, null, 2)}`, this.uri);

    if (this._fatalErrors.length > 0) {
      throw new projError(`\nFATAL ERROR due to invalid setting in "${this.name}/.vscode/settings.json". Extension cannot continue. ` +
        `${this._fatalErrors.join("\n")}\n` +
        `NOTE: fatal errors may require you to restart vscode after correcting the problem.) `, this.uri);
    }

  }

}



