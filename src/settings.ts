import * as vscode from 'vscode';
import * as fs from 'fs';
import { EXTENSION_NAME, getActualWorkspaceSetting, getUrisOfWkspFoldersWithFeatures, getWorkspaceFolder, WkspError } from './common';
import { config } from './configuration';
import { Logger } from './logger';


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
  public envVarOverrides: { [name: string]: string } = {}; // TODO - make readonly when deprecated setting is removed
  public fastSkipTags: string[] = []; // TODO - make readonly when deprecated setting is removed
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
  private readonly _fatalErrors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this.uri = wkspUri;
    const wsFolder = getWorkspaceFolder(wkspUri);
    this.name = wsFolder.name;

    // note: undefined should never happen (or packages.json is wrong) as get will return a default value for packages.json settings
    const envVarOverridesCfg: { [name: string]: string } | undefined = wkspConfig.get("envVarOverrides");
    if (envVarOverridesCfg === undefined)
      throw "envVarOverrides is undefined";
    const fastSkipTagsCfg: string[] | undefined = wkspConfig.get("fastSkipTags");
    if (fastSkipTagsCfg === undefined)
      throw "fastSkipTags is undefined";
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
      this._fatalErrors.push(`features path ${this.featuresUri.fsPath} not found.`);
    }

    if (fastSkipTagsCfg) {
      const err = `Invalid fastSkipTags setting ${JSON.stringify(fastSkipTagsCfg)} will be ignored.`;
      try {
        if (typeof fastSkipTagsCfg !== "object") {
          this._warnings.push(err);
        }
        else {
          for (const tag of fastSkipTagsCfg) {
            if (typeof tag !== "string") {
              this._warnings.push(`${err} ${tag} is not a string.`);
              break;
            }
            if (!tag.startsWith("@")) {
              this._warnings.push(`${err} ${tag} does not start with @`);
              break;
            }
            else {
              this.fastSkipTags.push(tag);
            }
          }
        }
      }
      catch {
        this._warnings.push(err);
      }
    }

    if (envVarOverridesCfg) {
      const err = `Invalid envVarOverrides setting ${JSON.stringify(envVarOverridesCfg)} ignored.`;
      try {
        if (typeof envVarOverridesCfg !== "object") {
          this._warnings.push(err);
        }
        else {
          for (const name in envVarOverridesCfg) {
            // just check for "=" typo
            if (name.includes("=")) {
              this._warnings.push(`${err} ${name} must not contain =`);
              break;
            }
            const value = envVarOverridesCfg[name];
            if (value) {
              if (typeof value !== "string") {
                this._warnings.push(`${err} ${value} is not a string`);
                break;
              }
              this.envVarOverrides[name] = value;
            }
          }
        }
      }
      catch {
        this._warnings.push(err);
      }
    }


    if (this.fastSkipTags.length === 0) {
      const warning = tryDeprecatedFastSkipList(this, wkspConfig);
      if (warning)
        this._warnings.push(warning);
    }

    if (Object.keys(this.envVarOverrides).length === 0) {
      const warning = tryDeprecatedEnvVarList(this, wkspConfig);
      if (warning)
        this._warnings.push(warning);
    }

    if (this.runParallel && this.runAllAsOne)
      this._warnings.push(`${EXTENSION_NAME}.runParallel is overridden by ${EXTENSION_NAME}.runAllAsOne whenever you run all tests at once. (This may or may not be your desired set up.)`);

    if (this.fastSkipTags.length > 0 && this.runAllAsOne)
      this._warnings.push(`${EXTENSION_NAME}.fastSkipTags has no effect when ${EXTENSION_NAME}.runAllAsOne is enabled and you run all tests at once. (This may or may not be your desired set up.)`);

    if (!this.runParallel && !this.runAllAsOne)
      this._warnings.push(`${EXTENSION_NAME}.runParallel and ${EXTENSION_NAME}.runAllAsOne are both disabled. This will run each test sequentially and give the slowest performance.`);


    this.logUserSettings(logger, winSettings);
  }


  logUserSettings(logger: Logger, winSettings: WindowSettings) {

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
    const nonUserSettableWkspSettings = ["name", "uri", "featuresUri"];
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

    if (winSettings.showSettingsWarnings) {

      if (this._warnings.length > 0) {
        logger.logSettingsWarning(`\n${this._warnings.map(warn => "WARNING: " + warn).join("\n")}`, this.uri);
        logger.logInfo(`If you are happy with your settings, can disable these warnings via the extension ` +
          `setting '${EXTENSION_NAME}.showSettingsWarnings'.\n`, this.uri);
      }
    }

    if (this._fatalErrors.length > 0) {
      logger.logSettingsWarning(`\n${this._warnings.map(err => "FATAL ERROR: " + err).join("\n")}`, this.uri);
      throw new WkspError(`Fatal error due to invalid workspace setting in workspace "${this.name}", cannot continue.`, this.uri);
    }
  }

}



function tryDeprecatedFastSkipList(wkspSettings: WorkspaceSettings, wkspConfig: vscode.WorkspaceConfiguration): string | undefined {

  const fastSkipListCfg: string | undefined = wkspConfig.get("fastSkipList");

  if (fastSkipListCfg) {
    if (fastSkipListCfg.indexOf("@") === -1 || fastSkipListCfg.length < 2)
      return `Invalid ${EXTENSION_NAME}.fastSkipList setting ignored.`;

    try {
      const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
      let invalid = false;
      skipList.forEach(s => { s = s.trim(); if (s !== "" && !s.trim().startsWith("@")) invalid = true; });
      if (invalid)
        return `Invalid ${EXTENSION_NAME}.fastSkipList setting ignored.`;
      wkspSettings.fastSkipTags = skipList.filter(s => s !== "");
    }
    catch {
      return `Invalid ${EXTENSION_NAME}.fastSkipList setting ignored.`;
    }

    return `${EXTENSION_NAME}.fastSkipList setting is deprecated and will be removed in a future release. Please use ${EXTENSION_NAME}.fastSkipTags instead.`;
  }

}


function tryDeprecatedEnvVarList(wkspSettings: WorkspaceSettings, wkspConfig: vscode.WorkspaceConfiguration): string | undefined {

  const envVarListCfg: string | undefined = wkspConfig.get("envVarList");

  if (envVarListCfg) {
    if (envVarListCfg.indexOf(":") === -1 || envVarListCfg.indexOf("'") === -1 || envVarListCfg.length < 7)
      return `Invalid ${EXTENSION_NAME}.envVarList setting ignored.`;

    try {
      const escape = "#^@";
      const envList = envVarListCfg.replace(/'\s*:\s*'/g, "':'").replace(/'\s*,\s*'/g, "','").trim();
      envList.split("',").filter(s => s.trim() !== "").map(s => {
        s = s.replace(/\\'/g, escape);
        const e = s.split("':");
        const name = e[0].trim().replace(/'/g, "").replace(escape, "'");
        const value = e[1].trim().replace(/'/g, "").replace(escape, "'");
        console.log(`${name}='${value}'`)
        wkspSettings.envVarOverrides[name] = value;
      });
    }
    catch {
      return `Invalid ${EXTENSION_NAME}.envVarList setting ignored.`;
    }

    return `${EXTENSION_NAME}.envVarList setting is deprecated and will be removed in a future release. Please use ${EXTENSION_NAME}.envVarOverrides instead.`;
  }
}
