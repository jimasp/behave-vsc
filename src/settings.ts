import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  findSubDirectorySync,
  getActualWorkspaceSetting,
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder, normalise_relative_path, uriId, WkspError
} from './common';
import { config } from './configuration';
import { Logger } from './logger';


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
  public readonly workspaceRelativeFeaturesPaths: string[] = [];
  public readonly stepLibraries: StepLibrariesSetting = [];
  // convenience properties
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly featuresUris: vscode.Uri[] = [];
  public readonly workspaceRelativeBaseDirPath: string;
  public readonly workspaceRelativeStepsSearchPaths: string[] = [];
  public readonly stepsFolderIsInFeaturesFolder: boolean = false;
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
    const relativeFeaturesPathsCfg: string[] | undefined = wkspConfig.get("relativeFeaturesPaths");
    if (relativeFeaturesPathsCfg === undefined)
      throw "relativefeaturesPaths is undefined";
    const justMyCodeCfg: boolean | undefined = wkspConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = wkspConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";

    let requestedStepLibraries: StepLibrariesSetting = [];
    try {
      const stepLibrariesCfg: StepLibrariesSetting | undefined = wkspConfig.get("stepLibraries");
      if (stepLibrariesCfg === undefined)
        throw "stepLibraries is undefined";
      requestedStepLibraries = stepLibrariesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.stepLibraries" setting was ignored.', "OK");
    }

    try {
      const envVarOverridesCfg: { [name: string]: string } | undefined = wkspConfig.get("envVarOverrides");
      if (envVarOverridesCfg === undefined)
        throw "envVarOverrides is undefined";
      this.envVarOverrides = envVarOverridesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.envVarOverrides" setting was ignored.', "OK");
    }

    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;

    if (getActualWorkspaceSetting(wkspConfig, "relativeFeaturesPaths")) {
      for (const featuresPath of relativeFeaturesPathsCfg) {
        this.workspaceRelativeFeaturesPaths.push(normalise_relative_path(featuresPath));
      }
    }
    else {
      this.workspaceRelativeFeaturesPaths = [normalise_relative_path(featuresPathCfg)];
      logger.showWarn(`"behave-vsc.featuresPath" setting is DEPRECATED. Please use "behave-vsc.relativeFeaturesPaths" instead.`, this.uri);
    }

    if (this.workspaceRelativeFeaturesPaths.length === 0 || this.workspaceRelativeFeaturesPaths[0] === "")
      this.workspaceRelativeFeaturesPaths = ["features"];

    let stepsSearchRelPath: string;
    for (const featuresPath of this.workspaceRelativeFeaturesPaths) {

      if (featuresPath === ".")
        this._fatalErrors.push(`"." is not a valid "behave-vsc.featuresPath" value. The features folder must be a subfolder.`);

      const featuresUri = vscode.Uri.joinPath(wkspUri, featuresPath);
      this.featuresUris.push(featuresUri);

      if (!fs.existsSync(featuresUri.fsPath)) {
        // note - this error should never happen or some logic/hooks are wrong 
        // (or the user has actually deleted/moved the features path since loading)
        // because the existence of the path should always be checked by getUrisOfWkspFoldersWithFeatures(true)
        // before we get here (i.e. called elsewhere when workspace folders/settings are changed etc.)    
        this._fatalErrors.push(`ERROR: features path "${featuresUri.fsPath}" does not exist on disk.`);
        this.logSettings(logger, winSettings);
        return;
      }

      if (!this.stepsFolderIsInFeaturesFolder)
        this.stepsFolderIsInFeaturesFolder = findSubDirectorySync(featuresUri.fsPath, "steps") !== null ? true : false;

      if (this.stepsFolderIsInFeaturesFolder) {
        // watch features folder for (possibly multiple) "steps" subfolders (e.g. like example 
        // project B/features folder which imports grouped/steps and grouped2/steps).
        // NOTE - if features/steps exists, we still need to look for e.g. features/grouped/steps
        // so the stepsSearchRelPath in that case will be "features" NOT "features/steps".
        stepsSearchRelPath = path.relative(this.uri.fsPath, featuresUri.fsPath).replace(/\\/g, "/");
        if (!this.workspaceRelativeStepsSearchPaths.includes(stepsSearchRelPath))
          this.workspaceRelativeStepsSearchPaths.push(stepsSearchRelPath);
      }
    }

    // default the baseDir to the first featuresPath.
    // baseDir is a concept borrowed from behave's source code and is partly used to calculate 
    // junit filenames (see comment in getJunitFeatureName in junitParser.ts)    
    let baseDirUri = vscode.Uri.joinPath(this.featuresUris[0]);

    if (!this.stepsFolderIsInFeaturesFolder) {
      // no steps folder in features folder, so use findStepsParentDirectorySync to recurse upwards 
      // from the features folder to the wksp folder root looking for a "steps" folder or "environment.py" file      
      const findStepsParentDirResult = findStepsParentDirectorySync(this.featuresUris[0].fsPath, this.uri.fsPath);
      if (findStepsParentDirResult) {
        const stepsParentFsPath = findStepsParentDirResult.fsPath;
        if (findStepsParentDirResult.environmentpyOnly) {
          logger.showWarn(`environment.py was found in "${stepsParentFsPath}", ` +
            "but no steps folder was found in that directory.", this.uri);
        }
        baseDirUri = vscode.Uri.file(stepsParentFsPath);
        stepsSearchRelPath = path.join(path.relative(this.uri.fsPath, stepsParentFsPath), "steps").replace(/\\/g, "/");
        this.workspaceRelativeStepsSearchPaths.push(stepsSearchRelPath);
      }
      else {
        logger.showWarn(`No "steps" folder found.`, this.uri);
      }
    }

    this.workspaceRelativeBaseDirPath = path.relative(this.uri.fsPath, baseDirUri.fsPath).replace(/\\/g, "/");

    this.setStepLibraries(requestedStepLibraries, logger, wkspUri);

    this.logSettings(logger, winSettings);
  }


  setStepLibraries(requestedStepLibraries: StepLibrariesSetting, logger: Logger, wkspUri: vscode.Uri) {
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
      for (const relStepSearchPath of this.workspaceRelativeStepsSearchPaths) {
        if (RegExp(rxPath).test(relStepSearchPath)) {
          rxMatch = true;
          break;
        }
      }
      if (rxMatch
        || this.workspaceRelativeStepsSearchPaths.includes(relativePath)
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
        stepLibrary.relativePath = relativePath;
        this.stepLibraries.push(stepLibrary);
      }
    }
  }


  logSettings(logger: Logger, winSettings: InstanceSettings) {

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
    wkspEntries.push(["fullFeaturesPaths", this.featuresUris.map(featureUri => featureUri.fsPath)]);
    wkspEntries.push(["junitTempPath", config.extensionTempFilesUri.fsPath]);
    wkspEntries = wkspEntries.filter(([key]) => !key.startsWith("_") && !nonUserSettableWkspSettings.includes(key) && key !== "workspaceRelativeFeaturesPath");
    wkspEntries.push(["featuresPath", this.workspaceRelativeFeaturesPaths]);
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

type findStepsParentDirectorySyncResult = {
  environmentpyOnly: boolean,
  fsPath: string
}

function findStepsParentDirectorySync(startPath: string, stopPath: string): findStepsParentDirectorySyncResult | null {
  let currentPath = startPath;
  while (currentPath.startsWith(stopPath)) {
    const files = fs.readdirSync(currentPath);
    if (files.includes("steps") || files.includes("environment.py")) {
      const epo = files.includes("environment.py") && !files.includes("steps");
      return { environmentpyOnly: epo, fsPath: currentPath };
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}


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