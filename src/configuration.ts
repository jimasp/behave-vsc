import * as os from 'os';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { getWorkspaceFolderUris } from './helpers';

export const EXTENSION_NAME = "behave-vsc";
export const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
export const EXTENSION_FRIENDLY_NAME = "Behave VSC";
export const MSPY_EXT = "ms-python.python";
const ERR_HIGHLIGHT = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";


export interface ExtensionConfiguration {
  readonly tempFilesUri: vscode.Uri;
  readonly logger: Logger;
  getWorkspaceSettings(wkspUri: vscode.Uri): WorkspaceSettings;
  reloadWorkspaceSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
  public readonly tempFilesUri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), EXTENSION_NAME);
  public readonly logger: Logger = new Logger();
  private static _workspaceSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

  private static _configuration?: Configuration;

  private constructor() {
    Configuration._configuration = this;
    console.log("Configuration singleton constructed (this should only fire once except for test runs)");
  }

  static get configuration() {
    if (Configuration._configuration)
      return Configuration._configuration;

    Configuration._configuration = new Configuration();
    return Configuration._configuration;
  }

  // called by onDidChangeConfiguration
  public reloadWorkspaceSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined = undefined) {
    this.logger.clear();
    this.logger.logInfo("Settings change detected.");

    if (!testConfig)
      Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
    else
      Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, this.logger);
  }

  public getWorkspaceSettings(wkspUri: vscode.Uri) {
    return Configuration._workspaceSettings[wkspUri.path]
      ? Configuration._workspaceSettings[wkspUri.path]
      : Configuration._workspaceSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
  }

  // note - this can be changed dynamically by the user, so don't store the result
  public getPythonExec = async (wkspUri: vscode.Uri): Promise<string> => {
    return await getPythonExecutable(this.logger, wkspUri);
  }

}


class Logger {

  private outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel(EXTENSION_FRIENDLY_NAME);
  public run: vscode.TestRun | undefined = undefined;

  show = () => {
    this.outputChannel.show();
  }

  clear = () => {
    this.outputChannel.clear();
  }

  logInfo = (text: string) => {
    console.log(text);
    this.outputChannel.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  }

  logWarn = (text: string) => {
    console.log(text);
    this.outputChannel.appendLine(text);
    this.outputChannel.show(true);
    if (this.run)
      this.run?.appendOutput(text);
  }

  logError = (msgOrError: unknown, prependMsg = "") => {

    let text = (msgOrError instanceof Error ? (msgOrError.stack ? msgOrError.stack : msgOrError.message) : msgOrError as string);
    if (prependMsg)
      text = `${prependMsg}\n${text}`;

    console.error(text);
    this.outputChannel.appendLine(ERR_HIGHLIGHT);
    this.outputChannel.appendLine(text);
    this.outputChannel.appendLine(ERR_HIGHLIGHT);
    this.outputChannel.show(true);
    vscode.debug.activeDebugConsole.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  }
}


export class WorkspaceSettings {
  // user-settable
  public envVarList: { [name: string]: string } = {};
  public showConfigurationWarnings: boolean;
  public fastSkipList: string[] = [];
  public featuresPath = "features";
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  public runWorkspacesInParallel: boolean;
  // other public properties
  public uri: vscode.Uri;
  public name: string;
  public fullFeaturesPath: string;
  // internal
  private _errors: string[] = [];
  private _logger: Logger;

  constructor(wkspUri: vscode.Uri, wsConfig: vscode.WorkspaceConfiguration, logger: Logger) {

    this._logger = logger;
    this.uri = wkspUri;

    const wsFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
    if (!wsFolder)
      throw new Error("No workspace folder found for uri " + wkspUri.path);
    this.name = wsFolder.name;

    const envVarListCfg: string | undefined = wsConfig.get("envVarList");
    const fastSkipListCfg: string | undefined = wsConfig.get("fastSkipList");
    const featuresPathCfg: string | undefined = wsConfig.get("featuresPath");
    const justMyCodeCfg: boolean | undefined = wsConfig.get("justMyCode");
    const runAllAsOneCfg: boolean | undefined = wsConfig.get("runAllAsOne");
    const runParallelCfg: boolean | undefined = wsConfig.get("runParallel");
    const runWorkspacesInParallelCfg: boolean | undefined = wsConfig.get("runWorkspacesInParallel"); // (not a workspace-specific setting)
    const showConfigurationWarningsCfg: boolean | undefined = wsConfig.get("showConfigurationWarnings");

    this.showConfigurationWarnings = showConfigurationWarningsCfg === undefined ? true : showConfigurationWarningsCfg;
    this.justMyCode = justMyCodeCfg === undefined ? true : justMyCodeCfg;
    this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;
    this.runParallel = runParallelCfg === undefined ? false : runParallelCfg;
    this.runWorkspacesInParallel = runWorkspacesInParallelCfg === undefined ? true : runWorkspacesInParallelCfg;

    if (featuresPathCfg)
      this.featuresPath = featuresPathCfg.trim().replace(/\\$|\/$/, "");
    this.fullFeaturesPath = vscode.Uri.joinPath(wkspUri, this.featuresPath).path;
    if (!fs.existsSync(this.fullFeaturesPath))
      this._errors.push(`FATAL ERROR: features path ${this.fullFeaturesPath} not found.`);


    if (fastSkipListCfg) {
      if (!fastSkipListCfg.includes("@") || fastSkipListCfg.length < 2) {
        this._errors.push("Invalid FastSkipList setting ignored.");
      }
      else {
        try {
          const skipList = fastSkipListCfg.replace(/\s*,\s*/g, ",").trim().split(",");
          let invalid = false;
          skipList.forEach(s => { s = s.trim(); if (s !== "" && !s.trim().startsWith("@")) invalid = true; });
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
            console.log(`${name}='${value}'`)
            this.envVarList[name] = value;
          }

        }
        catch {
          this._errors.push("Invalid EnvVarList setting ignored.");
        }
      }
    }

    this.logUserSettings();
  }

  logUserSettings() {

    const entries = Object.entries(this).sort();

    const dic: { [name: string]: string } = {};

    entries.forEach(([key, value]) => {
      // remove non-user-settable properties
      if (!key.startsWith("_") && key !== "name" && key !== "runWorkspacesInParallel" && key !== "fullFeaturesPath"
        && key !== "uri" && key !== "fullWorkingDirectoryPath")
        dic[key] = value;
    });

    const wsUris = getWorkspaceFolderUris();
    if (wsUris.length > 0 && this.uri === wsUris[0])
      this._logger.logInfo(`\nMulti-root workspace settings:\n{\n  "runWorkspacesInParallel": ${this.runWorkspacesInParallel}\n}`);

    this._logger.logInfo(`\n${this.name} settings:\n${JSON.stringify(dic, null, 2)}`);
    this._logger.logInfo(`fullFeaturesPath: ${this.fullFeaturesPath}`);

    if (this.showConfigurationWarnings) {
      let warned = false;
      if (this.runParallel && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("\nWarning: runParallel is overridden by runAllAsOne when you run all tests at once.");
      }

      if (this.fastSkipList.length > 0 && this.runAllAsOne) {
        warned = true;
        this._logger.logWarn("Warning: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).");
      }

      if (warned)
        this._logger.logInfo(`(You can turn off configuration warnings via the extension setting ${EXTENSION_NAME}.showConfigurationWarnings.)`);
    }

    if (this._errors && this._errors.length > 0) {
      this._logger.logError(`${this._errors.join("\n")}`);
    }
  }

}

const getPythonExecutable = async (logger: Logger, scope: vscode.Uri) => {

  const pyext = vscode.extensions.getExtension(MSPY_EXT);


  if (!pyext) {
    const msg = EXTENSION_FRIENDLY_NAME + " could not find required dependency " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  if (!pyext.isActive) {
    await pyext?.activate();
    if (!pyext.isActive) {
      const msg = EXTENSION_FRIENDLY_NAME + " could not activate required dependency " + MSPY_EXT;
      vscode.window.showErrorMessage(msg);
      logger.logError(msg);
      return undefined;
    }
  }

  const pythonExec = await pyext?.exports.settings.getExecutionDetails(scope).execCommand[0];
  if (!pythonExec) {
    const msg = EXTENSION_FRIENDLY_NAME + " failed to obtain python executable from " + MSPY_EXT;
    vscode.window.showErrorMessage(msg);
    logger.logError(msg);
    return undefined;
  }

  return pythonExec;
}


export default Configuration.configuration;


