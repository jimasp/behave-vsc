import * as vscode from 'vscode';
import * as fs from 'fs';
import { getWorkspaceFolderUris } from './helpers';
import { Logger } from './Logger';
import { EXTENSION_NAME } from './Configuration';


export class WindowSettings {
  // class for package.json "window" settings 
  // these apply to the whole vscode instance, but may be set in settings.json or *.code-workspace
  public alwaysShowOutput: boolean;
  public runWorkspacesInParallel: boolean;
  public showConfigurationWarnings: boolean;

  constructor(winConfig: vscode.WorkspaceConfiguration) {

    const alwaysShowOutputCfg: boolean | undefined = winConfig.get("alwaysShowOutput");
    if (alwaysShowOutputCfg === undefined)
      throw "alwaysShowOutput is undefined";
    const runWorkspacesInParallelCfg: boolean | undefined = winConfig.get("runWorkspacesInParallel");
    if (runWorkspacesInParallelCfg === undefined)
      throw "runWorkspacesInParallel is undefined";
    const showConfigurationWarningsCfg: boolean | undefined = winConfig.get("showConfigurationWarnings");
    if (showConfigurationWarningsCfg === undefined)
      throw "showConfigurationWarnings is undefined";

    this.alwaysShowOutput = alwaysShowOutputCfg;
    this.runWorkspacesInParallel = runWorkspacesInParallelCfg;
    this.showConfigurationWarnings = showConfigurationWarningsCfg;
  }
}

export class WorkspaceSettings {
  // class for package.json "resource" settings in settings.json
  // these apply to a single workspace 

  // user-settable
  public envVarList: { [name: string]: string; } = {};
  public fastSkipList: string[] = [];
  public featuresPath = "features";
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  // convenience properties
  public uri: vscode.Uri;
  public name: string;
  public fullFeaturesPath: string;
  public fullFeaturesFsPath: string;
  // internal
  private _errors: string[] = [];
  private _logger: Logger;


  constructor(wkspUri: vscode.Uri, wkspConfig: vscode.WorkspaceConfiguration, winSettings: WindowSettings, logger: Logger) {

    this._logger = logger;
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

    const runAllAsOneCfg: boolean | undefined = getActualValue("runAllAsOne");


    this.justMyCode = justMyCodeCfg;
    this.runParallel = runParallelCfg;


    if (this.runParallel && runAllAsOneCfg === undefined)
      this.runAllAsOne = false;
    else
      this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;

    if (featuresPathCfg)
      this.featuresPath = featuresPathCfg.trim().replace(/^\\|^\//, "").replace(/\\$|\/$/, "");
    const fullFeaturesUri = vscode.Uri.joinPath(wkspUri, this.featuresPath);
    this.fullFeaturesPath = fullFeaturesUri.path;
    this.fullFeaturesFsPath = fullFeaturesUri.fsPath;
    if (!fs.existsSync(this.fullFeaturesFsPath)) {
      this._errors.push(`FATAL ERROR: features path ${this.fullFeaturesFsPath} not found.`);
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
            s = s.trim(); if (s !== "" && !s.trim().startsWith("@"))
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

    this.logUserSettings(fatal, winSettings);
  }


  logUserSettings(fatal: boolean, winSettings: WindowSettings) {

    const entries = Object.entries(this).sort();
    const dic: { [name: string]: string; } = {};

    // remove non-user-settable properties        
    const nonUser = ["name", "uri", "fullFeaturesPath", "fullFeaturesFsPath", "fullWorkingDirectoryPath"];
    entries.forEach(([key, value]) => {
      if (!key.startsWith("_") && !nonUser.includes(key))
        dic[key] = value;
    });

    const wsUris = getWorkspaceFolderUris();
    if (wsUris.length > 0 && this.uri === wsUris[0])
      this._logger.logInfoAllWksps(`\nglobal (window) settings:\n${JSON.stringify(winSettings, null, 2)}`);

    this._logger.logInfo(`\n${this.name} (resource) settings:\n${JSON.stringify(dic, null, 2)}`, this.uri);
    this._logger.logInfo(`fullFeaturesPath: ${this.fullFeaturesFsPath}`, this.uri);

    if (winSettings.showConfigurationWarnings) {

      let warned = false;
      this._logger.logInfo("\n", this.uri);

      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("WARNING: runParallel is overridden by runAllAsOne when you run all tests at once.", this.uri);
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("WARNING: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).", this.uri);
      }

      if (!this.runParallel && !this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("WARNING: runParallel and runAllAsOne are both disabled. This will give the slowest performance.", this.uri);
      }

      if (warned)
        this._logger.logInfo(`(You can turn off configuration warnings via the extension setting ${EXTENSION_NAME}.showConfigurationWarnings.)`, this.uri);
    }

    if (this._errors && this._errors.length > 0) {
      this._logger.logErrorAllWksps(`${this._errors.join("\n")}`);
    }

    if (fatal)
      throw "fatal error due to invalid workspace setting, cannot continue. see previous error for more details.";
  }

}
