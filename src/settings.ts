import * as vscode from 'vscode';
import * as fs from 'fs';
import { getActualWorkspaceSetting, getUrisOfWkspFoldersWithFeatures, getWorkspaceFolder, WkspError } from './common';
import { config, EXTENSION_NAME } from './Configuration';
import { Logger } from './Logger';


export class WindowSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json or *.code-workspace 
  // (in a multi-root workspace they will be read from *.code-workspace, and greyed-out and disabled in settings.json)
  public readonly multiRootRunWorkspacesInParallel: boolean;
  public readonly showSettingsWarnings: boolean;
  public readonly xRay: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    const showSettingsWarningsCfg: boolean | undefined = winConfig.get("showSettingsWarnings");
    if (showSettingsWarningsCfg === undefined)
      throw "showSettingsWarnings is undefined";
    const xRayCfg: boolean | undefined = winConfig.get("xRay");
    if (xRayCfg === undefined)
      throw "xRay is undefined";

    this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallelCfg;
    this.showSettingsWarnings = showSettingsWarningsCfg;
    this.xRay = xRayCfg;
  }
}

export class WorkspaceSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace 

  // user-settable
  public readonly envVarList: { [name: string]: string } = {};
  public readonly fastSkipList: string[] = [];
  public readonly justMyCode: boolean;
  public readonly runAllAsOne: boolean;
  public readonly runParallel: boolean;
  public readonly workspaceRelativeFeaturesPath: string;
  // convenience properties
  public readonly uri: vscode.Uri;
  public readonly name: string;
  public readonly featuresUri: vscode.Uri;
  // internal
  private readonly _warnings: string[] = [];
  private readonly _errors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this.uri = wkspUri;
    const wsFolder = getWorkspaceFolder(wkspUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const envVarListCfg: { [name: string]: string } | undefined = wkspConfig.get("envVarList");
    if (envVarListCfg === undefined)
      throw "envVarList is undefined";
    const fastSkipListCfg: string[] | undefined = wkspConfig.get("fastSkipList");
    if (fastSkipListCfg === undefined)
      throw "fastSkipList is undefined";
    const featuresPathCfg: string | undefined = wkspConfig.get("featuresPath");
    if (featuresPathCfg === undefined)
      throw "featuresPath is undefined";
    const justMyCodeCfg: boolean | undefined = wkspConfig.get("justMyCode");
    if (justMyCodeCfg === undefined)
      throw "justMyCode is undefined";
    const runParallelCfg: boolean | undefined = wkspConfig.get("runParallel");
    if (runParallelCfg === undefined)
      throw "runParallel is undefined";


    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;

    const runAllAsOneCfg: boolean | undefined = getActualWorkspaceSetting(wkspConfig, "runAllAsOne");
    if (this.runParallel && runAllAsOneCfg === undefined)
      this.runAllAsOne = false;
    else
      this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;


    this.workspaceRelativeFeaturesPath = featuresPathCfg.replace(/^\\|^\//, "").replace(/\\$|\/$/, "").trim();
    // vscode will not substitute a default if an empty string is specified in settings.json
    if (!this.workspaceRelativeFeaturesPath)
      this.workspaceRelativeFeaturesPath = "features";
    this.featuresUri = vscode.Uri.joinPath(wkspUri, this.workspaceRelativeFeaturesPath);
    if (!fs.existsSync(this.featuresUri.fsPath)) {
      // note - this error should never happen or some logic/hooks are wrong 
      // (or the user has actually deleted/moved the features path since loading)
      // because the existence of the path should always be checked by getUrisOfWkspFoldersWithFeatures(true)
      // before we get here (i.e. called elsewhere when workspace folders/settings are changed etc.)    
      this._errors.push(`features path ${this.featuresUri.fsPath} not found.`);
    }

    if (fastSkipListCfg) {
      const err = `Invalid FastSkipList setting ${JSON.stringify(fastSkipListCfg)} will be ignored. Property format in settings.json should be [ "@skip1", "@skip2" ]`;
      try {
        if (typeof fastSkipListCfg !== "object") {
          this._warnings.push(err);
        }
        else {
          for (const tag of fastSkipListCfg) {
            if (typeof tag !== "string") {
              this._warnings.push(err);
              break;
            }
            if (!tag.startsWith("@")) {
              this._warnings.push(err);
              break;
            }
            else {
              this.fastSkipList.push(tag);
            }
          }
        }
      }
      catch {
        this._warnings.push(err);
      }
    }

    if (envVarListCfg) {
      const err = `Invalid EnvVarList setting ${JSON.stringify(envVarListCfg)} ignored. Property format in settings.json should be { "stringvar": "value1", "numvar": 2 }`;
      try {
        if (typeof envVarListCfg !== "object") {
          this._warnings.push(err);
        }
        else {
          for (const key in envVarListCfg) {
            if (key.includes("=")) {
              this._warnings.push(err);
              break;
            }
            const value = envVarListCfg[key];
            if (value) {
              if (typeof value !== "string" && typeof value !== "number") {
                this._warnings.push(err);
                break;
              }
              this.envVarList[key] = value;
            }
          }
        }
      }
      catch {
        this._warnings.push(err);
      }
    }


    this.logUserSettings(logger, winSettings);
  }


  logUserSettings(logger: Logger, winSettings: WindowSettings) {

    let nonUserSettable: string[] = [];

    // build output dict of user-settable properties for window settings
    nonUserSettable = [];
    const winSettingsDic: { [name: string]: string; } = {};
    const winEntries = Object.entries(winSettings).sort()
    winEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettable.includes(key)) {
        winSettingsDic[key] = value;
      }
    });

    const wkspUris = getUrisOfWkspFoldersWithFeatures();
    if (wkspUris.length > 0 && this.uri === wkspUris[0])
      logger.logInfoAllWksps(`\nglobal (window) settings:\n${JSON.stringify(winSettingsDic, null, 2)}`);

    // build output dict of user-settable properties for workspace settings 
    nonUserSettable = ["name", "uri", "featuresUri"];
    const wkspSettingsDic: { [name: string]: string; } = {};
    const wkspEntries = Object.entries(this).sort();
    wkspEntries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUserSettable.includes(key)) {
        const name = key === "workspaceRelativeFeaturesPath" ? "featuresPath" : key;
        wkspSettingsDic[name] = value;
      }
    });

    logger.logInfo(`\n${this.name} (resource) settings:\n${JSON.stringify(wkspSettingsDic, null, 2)}`, this.uri);
    logger.logInfo(`fullFeaturesPath: ${this.featuresUri.fsPath}`, this.uri);
    logger.logInfo(`junitTempPath: ${config.extensionTempFilesUri.fsPath}`, this.uri);

    if (winSettings.showSettingsWarnings) {

      let warned = false;
      logger.logInfo("\n", this.uri);

      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        logger.logSettingsWarning("WARNING: runParallel is overridden by runAllAsOne whenever you run all tests at once. (This may or may not be your desired set up.)", this.uri);
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        logger.logSettingsWarning("WARNING: fastSkipList has no effect when runAllAsOne is enabled and you run all tests at once. (This may or may not be your desired set up.)", this.uri);
      }

      if (!this.runParallel && !this.runAllAsOne) {
        warned = true;
        logger.logSettingsWarning("WARNING: runParallel and runAllAsOne are both disabled. This will give the slowest performance.", this.uri);
      }

      if (warned)
        logger.logInfo(`(If you are happy with your settings, can turn off these warningsvia the extension setting '${EXTENSION_NAME}.showSettingsWarnings'.)\n`, this.uri);
    }

    if (this._warnings.length > 0)
      logger.showWarn(`${this._warnings.join("\n")}`, this.uri);

    // shouldn't get here for featurePath problems, see comment for featuresPath fatal error above
    if (this._errors.length > 0)
      throw new WkspError(`Fatal error due to invalid workspace setting in workspace "${this.name}", cannot continue. See previous error for more details.`, this.uri);

  }

}

