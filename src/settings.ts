import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  findSubDirectorySync,
  getUrisOfWkspFoldersWithFeatures,
  getWorkspaceFolder, uriId, WkspError
} from './common';
import { config } from './configuration';
import { Logger } from './logger';


export class WindowSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json or *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootRunWorkspacesInParallel: boolean;
  public readonly runProfiles: RunProfiles | undefined;
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
      const runProfilesCfg: RunProfiles | undefined = winConfig.get("runProfiles");
      if (runProfilesCfg === undefined)
        throw "runProfiles is undefined";
      this.runProfiles = runProfilesCfg;
    }
    catch {
      vscode.window.showWarningMessage('Invalid "behave-vsc.runProfiles" setting was ignored.', "OK");
    }

  }
}

export class WorkspaceSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace 

  // user-settable
  public readonly envVarOverrides: { [name: string]: string } = {};
  public readonly justMyCode: boolean;
  public readonly runParallel: boolean;
  public readonly workspaceRelativeFeaturesPath: string;
  public readonly workspaceRelativeStepLibraryPaths: string[] = [];
  // convenience properties
  public readonly id: string;
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly featuresUri: vscode.Uri;
  public readonly workspaceRelativeBaseDirPath: string;
  public readonly workspaceRelativeStepsSearchPath: string;
  // internal
  private readonly _fatalErrors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this.uri = wkspUri;
    this.id = uriId(wkspUri);
    const wsFolder = getWorkspaceFolder(wkspUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const featuresPathCfg: string | undefined = wkspConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const stepLibraryPathsCfg: string | undefined = wkspConfig.get("stepLibraryPaths");
    if (stepLibraryPathsCfg === undefined)
      throw "stepLibraryPaths is undefined";
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
      vscode.window.showWarningMessage('Invalid "behave-vsc.runProfiles" setting was ignored.', "OK");
    }

    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;


    this.workspaceRelativeFeaturesPath = featuresPathCfg.replace(/^\\|^\//, "").replace(/\\$|\/$/, "").trim();
    // vscode will not substitute a default if an empty string is specified in settings.json
    if (!this.workspaceRelativeFeaturesPath)
      this.workspaceRelativeFeaturesPath = "features";
    this.featuresUri = vscode.Uri.joinPath(wkspUri, this.workspaceRelativeFeaturesPath);
    if (this.workspaceRelativeFeaturesPath === ".")
      this._fatalErrors.push(`"." is not a valid "behave-vsc.featuresPath" value. The features folder must be a subfolder.`);
    if (!fs.existsSync(this.featuresUri.fsPath)) {
      // note - this error should never happen or some logic/hooks are wrong 
      // (or the user has actually deleted/moved the features path since loading)
      // because the existence of the path should always be checked by getUrisOfWkspFoldersWithFeatures(true)
      // before we get here (i.e. called elsewhere when workspace folders/settings are changed etc.)    
      this._fatalErrors.push(`features path ${this.featuresUri.fsPath} not found.`);
    }

    // default to watching features folder for (possibly multiple) "steps" 
    // subfolders (e.g. like example project B/features folder)
    // NOTE - if features/steps exists, we still need to look for e.g. features/grouped/steps
    // so the stepsSearchRelPath in that case will be "features" NOT "features/steps".
    // also note that baseDir is a concept borrowed from behave's source code (see comment in getJunitFeatureName in junitParser.ts)
    let baseDirUri = vscode.Uri.joinPath(this.featuresUri);
    let stepsSearchRelPath = path.relative(this.uri.fsPath, this.featuresUri.fsPath).replace(/\\/g, "/");
    const stepsFolderIsInFeaturesFolder = findSubDirectorySync(this.featuresUri.fsPath, "steps");

    // if no steps folder in features folder, then findStepsParentDirectorySync will recurse 
    // upwards from the features folder to the wksp root looking for a "steps" folder or "environment.py" file
    if (!stepsFolderIsInFeaturesFolder) {
      const findStepsParentDirResult = findStepsParentDirectorySync(this.featuresUri.fsPath, this.uri.fsPath);
      if (findStepsParentDirResult) {
        const stepsParentFsPath = findStepsParentDirResult.fsPath;
        if (findStepsParentDirResult.environmentpyOnly)
          logger.showWarn(`environment.py was found in "${stepsParentFsPath}", but no steps folder was found in that directory.`, this.uri);
        baseDirUri = vscode.Uri.file(stepsParentFsPath);
        stepsSearchRelPath = path.join(path.relative(this.uri.fsPath, stepsParentFsPath), "steps");
      }
      else {
        logger.showWarn(`No "steps" folder found.`, this.uri);
      }
    }

    this.workspaceRelativeStepsSearchPath = stepsSearchRelPath;
    this.workspaceRelativeBaseDirPath = path.relative(this.uri.fsPath, baseDirUri.fsPath).replace(/\\/g, "/");

    for (const folder of stepLibraryPathsCfg) {
      const relativePath = folder.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "").trim();
      if (relativePath === "steps"
        || relativePath === path.join(this.workspaceRelativeFeaturesPath, "steps")
        || relativePath === this.workspaceRelativeStepsSearchPath) {
        logger.showWarn(`steps folder "${relativePath}" specified in "behave-vsc.stepLibraryPaths" will be ignored ` +
          "as it was detected as a standard (non-library) steps path.", this.uri);
      }
      else {
        const folderUri = vscode.Uri.joinPath(wkspUri, relativePath);
        if (!fs.existsSync(folderUri.fsPath))
          logger.showWarn(`step library path "${folderUri.fsPath}" not found.`, this.uri);
        else
          this.workspaceRelativeStepLibraryPaths.push(relativePath);
      }
    }

    this.logSettings(logger, winSettings);
  }


  logSettings(logger: Logger, winSettings: WindowSettings) {

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
    wkspEntries.push(["fullFeaturesPath", this.featuresUri.fsPath]);
    wkspEntries.push(["junitTempPath", config.extensionTempFilesUri.fsPath]);
    wkspEntries = wkspEntries.filter(([key]) => !key.startsWith("_") && !nonUserSettableWkspSettings.includes(key) && key !== "workspaceRelativeFeaturesPath");
    wkspEntries.push(["featuresPath", this.workspaceRelativeFeaturesPath]);
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
      throw new WkspError(`\nFATAL error due to invalid workspace setting in workspace "${this.name}". Extension cannot continue. ` +
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


type RunProfile = {
  envVars: { [key: string]: string };
  tagExpression: string;
};

type RunProfiles = { [key: string]: RunProfile };


