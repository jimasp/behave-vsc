import * as vscode from 'vscode';
import * as fs from 'fs';
import { getUrisOfWkspFoldersWithFeatures, WkspError } from './common';
import { EXTENSION_NAME } from './Configuration';
import { Logger } from './Logger';


export class WindowSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json or *.code-workspace
  public alwaysShowOutput: boolean;
  public multiRootFolderIgnoreList: string[] = [];
  public multiRootRunWorkspacesInParallel: boolean;
  public showConfigurationWarnings: boolean;
  public errors: string[] = [];

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    // note: undefined should never happen (or packages.json is wrong)
    const alwaysShowOutputCfg: boolean | undefined = winConfig.get("alwaysShowOutput");
    if (alwaysShowOutputCfg === undefined)
      throw "alwaysShowOutput is undefined";
    const multiRootRunWorkspacesInParallelCfg: boolean | undefined = winConfig.get("multiRootRunWorkspacesInParallel");
    if (multiRootRunWorkspacesInParallelCfg === undefined)
      throw "multiRootRunWorkspacesInParallel is undefined";
    const showConfigurationWarningsCfg: boolean | undefined = winConfig.get("showConfigurationWarnings");
    if (showConfigurationWarningsCfg === undefined)
      throw "showConfigurationWarnings is undefined";
    const multiRootFolderIgnoreListCfg: string | undefined = winConfig.get("multiRootFolderIgnoreList");
    if (multiRootFolderIgnoreListCfg === undefined)
      throw "ignoreWorkspaceFolder is undefined";

    this.alwaysShowOutput = alwaysShowOutputCfg;
    this.multiRootRunWorkspacesInParallel = multiRootRunWorkspacesInParallelCfg;
    this.showConfigurationWarnings = showConfigurationWarningsCfg;


    if (multiRootFolderIgnoreListCfg) {
      try {
        const wkspFolderIgnoreList = multiRootFolderIgnoreListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
        this.multiRootFolderIgnoreList = wkspFolderIgnoreList.filter(s => s !== "");
      }
      catch {
        this.errors.push("Invalid WorkspaceFolders setting ignored.");
      }
    }
  }
}

export class WorkspaceSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace 

  // user-settable
  public envVarList: { [name: string]: string; } = {};
  public fastSkipList: string[] = [];
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  public workspaceRelativeFeaturesPath = "features";
  // convenience properties
  public uri: vscode.Uri;
  public name: string;
  public featuresUri: vscode.Uri;
  // internal
  private _errors: string[] = [];


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this.uri = wkspUri;
    let fatal = false;

    const wsFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
    if (!wsFolder)
      throw new Error("No workspace folder found for uri " + wkspUri.path);
    this.name = wsFolder.name;

    // get the actual value in the file or return undefined, this is
    // for cases where we need to distinguish between an unset value and the default value
    const getActualValue = <T>(name: string): T => {
      const value = wkspConfig.inspect(name)?.workspaceFolderValue;
      return (value as T);
    }

    // note: undefined should never happen (or packages.json is wrong)
    const envVarListCfg: string | undefined = wkspConfig.get("envVarList");
    if (envVarListCfg === undefined)
      throw "envVarList is undefined";
    const fastSkipListCfg: string | undefined = wkspConfig.get("fastSkipList");
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

    const runAllAsOneCfg: boolean | undefined = getActualValue("runAllAsOne");
    if (this.runParallel && runAllAsOneCfg === undefined)
      this.runAllAsOne = false;
    else
      this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;


    if (featuresPathCfg)
      this.workspaceRelativeFeaturesPath = featuresPathCfg.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "");
    this.featuresUri = vscode.Uri.joinPath(wkspUri, this.workspaceRelativeFeaturesPath);
    if (!fs.existsSync(this.featuresUri.fsPath)) {
      this._errors.push(`FATAL ERROR: features path ${this.featuresUri.fsPath} not found.`);
      fatal = true;
    }

    if (fastSkipListCfg) {
      if (!fastSkipListCfg.includes("@") || fastSkipListCfg.length < 2) {
        this._errors.push("Invalid FastSkipList setting ignored.");
      }
      else {
        try {
          const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
          let invalid = false;
          skipList.forEach(s => {
            s = s.trim();
            if (s !== "" && !s.startsWith("@"))
              invalid = true;
          });
          if (invalid)
            this._errors.push("Invalid FastSkipList setting ignored.");
          else
            this.fastSkipList = skipList.filter(s => s !== "");
        }
        catch {
          this._errors.push("Invalid FastSkipList setting ignored.");
        }
      }
    }

    if (envVarListCfg) {
      if (!envVarListCfg.includes(":") || !envVarListCfg.includes("'") || envVarListCfg.length < 7) {
        this._errors.push("Invalid EnvVarList setting ignored.");
      }
      else {
        try {
          const re = /(?:\s*,?)(?:\s*')(.*?)(?:'\s*)(?::\s*')(.*?)(?:'\s*)/g;
          const escape = "#^@";
          const escaped = envVarListCfg.replace(/\\'/g, escape);

          let matches;
          while ((matches = re.exec(escaped))) {
            if (matches.length !== 3)
              throw null;
            const name = matches[1].trim();
            if (name.length === 0) {
              throw null;
            }
            const value = matches[2].replace(escape, "'");
            console.log(`${name}='${value}'`);
            this.envVarList[name] = value;
          }

        }
        catch {
          this._errors.push("Invalid EnvVarList setting ignored.");
        }
      }
    }

    this.logUserSettings(logger, fatal, winSettings);
  }


  logUserSettings(logger: Logger, fatal: boolean, winSettings: WindowSettings) {

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

    if (winSettings.showConfigurationWarnings) {

      let warned = false;
      logger.logInfo("\n", this.uri);

      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: runParallel is overridden by runAllAsOne when you run all tests at once.", this.uri);
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).", this.uri);
      }

      if (!this.runParallel && !this.runAllAsOne) {
        warned = true;
        logger.logWarn("WARNING: runParallel and runAllAsOne are both disabled. This will give the slowest performance.", this.uri);
      }

      if (warned)
        logger.logInfo(`(You can turn off configuration warnings via the extension setting ${EXTENSION_NAME}.showConfigurationWarnings.)`, this.uri);
    }

    if (winSettings.errors.length > 0)
      logger.logError(new WkspError(winSettings.errors.join("\n"), this.uri));

    if (this._errors.length > 0)
      logger.logError(new WkspError(this._errors.join("\n"), this.uri));


    if (fatal)
      throw "fatal error due to invalid workspace setting, cannot continue. see previous error for more details.";

  }

}
