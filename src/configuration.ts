import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import * as fs from 'fs';

const EXTENSION_NAME = "behave-vsc";
const EXTENSION_FULL_NAME = "jimasp.behave-vsc";
const EXTENSION_FRIENDLY_NAME = "Behave VSC";
const MSPY_EXT = "ms-python.python";


export interface ExtensionConfiguration {
  readonly extensionName: string;
  readonly extensionFullName: string;
  readonly extensionFriendlyName: string;
  readonly debugOutputFilePath: string;
  readonly logger: Logger;
  userSettings(wkspUri: vscode.Uri): WorkspaceSettings;
  reloadUserSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined): void;
  getPythonExec(wkspUri: vscode.Uri): Promise<string>;
}


class Configuration implements ExtensionConfiguration {
  public readonly extensionName = EXTENSION_NAME;
  public readonly extensionFullName = EXTENSION_FULL_NAME;
  public readonly extensionFriendlyName = EXTENSION_FRIENDLY_NAME;
  public readonly debugOutputFilePath = path.join(os.tmpdir(), EXTENSION_NAME);
  public readonly logger: Logger = new Logger();
  private static _userSettings: { [wkspUriPath: string]: WorkspaceSettings } = {};

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
  public reloadUserSettings(wkspUri: vscode.Uri, testConfig: vscode.WorkspaceConfiguration | undefined = undefined) {
    this.logger.clear();
    this.logger.logInfo("Settings change detected.");

    if (!testConfig)
      Configuration._userSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
    else
      Configuration._userSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, testConfig, this.logger);
  }

  public userSettings(wkspUri: vscode.Uri) {
    return Configuration._userSettings[wkspUri.path]
      ? Configuration._userSettings[wkspUri.path]
      : Configuration._userSettings[wkspUri.path] = new WorkspaceSettings(wkspUri, vscode.workspace.getConfiguration(EXTENSION_NAME, wkspUri), this.logger);
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
    const ocHighlight = "\x1b \x1b \x1b \x1b \x1b \x1b \x1b";
    this.outputChannel.appendLine(ocHighlight);
    this.outputChannel.appendLine(text);
    this.outputChannel.appendLine(ocHighlight);
    this.outputChannel.show(true);
    vscode.debug.activeDebugConsole.appendLine(text);
    if (this.run)
      this.run?.appendOutput(text);
  }
}


export class WorkspaceSettings {
  public workspaceUri: vscode.Uri;
  public workspaceFolder: vscode.WorkspaceFolder;
  public envVarList: { [name: string]: string } = {};
  public fastSkipList: string[] = [];
  public featuresPath = "features";
  public justMyCode: boolean;
  public runAllAsOne: boolean;
  public runParallel: boolean;
  public workingDirectory = "";
  public fullFeaturesPath: string; // not set by user, derived from featuresPath  
  public fullWorkingDirectoryPath: string; // not set by user, derived from workingDirectory
  private _errors: string[] = [];
  private _logger: Logger;

  constructor(wkspUri: vscode.Uri, wsConfig: vscode.WorkspaceConfiguration, logger: Logger) {

    this._logger = logger;
    this.workspaceUri = wkspUri;

    const wsFolder = vscode.workspace.getWorkspaceFolder(wkspUri);
    if (!wsFolder)
      throw new Error("No workspace folder found for uri " + wkspUri.path);
    this.workspaceFolder = wsFolder;

    const envVarListCfg: string | undefined = wsConfig.get("envVarList");
    const fastSkipListCfg: string | undefined = wsConfig.get("fastSkipList");
    const featuresPathCfg: string | undefined = wsConfig.get("featuresPath");
    const workingDirectoryCfg: string | undefined = wsConfig.get("workingDirectory");
    const justMyCodeCfg: boolean | undefined = wsConfig.get("justMyCode");
    const runAllAsOneCfg: boolean | undefined = wsConfig.get("runAllAsOne");
    const runParallelCfg: boolean | undefined = wsConfig.get("runParallel");

    this.justMyCode = justMyCodeCfg === undefined ? true : justMyCodeCfg;
    this.runAllAsOne = runAllAsOneCfg === undefined ? true : runAllAsOneCfg;
    this.runParallel = runParallelCfg === undefined ? false : runParallelCfg;


    if (workingDirectoryCfg)
      this.workingDirectory = workingDirectoryCfg.trim().replace(/\\$|\/$/, "");
    this.fullWorkingDirectoryPath = vscode.Uri.joinPath(wkspUri, this.workingDirectory).path;
    // note - we can't use "vscode.workspace.fs.stat" here because that's an async func and we are in a constructor
    if (!fs.existsSync(this.fullWorkingDirectoryPath))
      this._errors.push(`FATAL ERROR: working directory ${this.fullWorkingDirectoryPath} not found.`);

    if (featuresPathCfg)
      this.featuresPath = featuresPathCfg.trim().replace(/\\$|\/$/, "");
    this.fullFeaturesPath = vscode.Uri.joinPath(wkspUri, this.featuresPath).path;
    if (!fs.existsSync(this.fullFeaturesPath))
      this._errors.push(`FATAL ERROR: features path ${this.fullFeaturesPath} not found.`);


    if (fastSkipListCfg) {
      if (fastSkipListCfg.indexOf("@") === -1 || fastSkipListCfg.length < 2) {
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
      if (envVarListCfg.indexOf(":") === -1 || envVarListCfg.indexOf("'") === -1 || envVarListCfg.length < 7) {
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
            const value = matches[2].trim().replace(escape, "'");
            console.log(`${name}='${value}'`)
            this.envVarList[name] = value;
          }

        }
        catch {
          this._errors.push("Invalid EnvVarList setting ignored.");
        }
      }
    }

    this.log();
  }

  log() {

    const entries = Object.entries(this).sort();

    const dic: { [name: string]: string } = {};

    entries.forEach(([key, value]) => {
      if (!key.startsWith("_") && key !== "fullFeaturesPath")
        dic[key] = value;
    });

    this._logger.logInfo(`\nsettings:\n${JSON.stringify(dic, null, 2)}`);
    this._logger.logInfo(`\nfullFeaturesPath: ${this.fullFeaturesPath}\n`);

    if (this.runParallel && this.runAllAsOne)
      this._logger.logWarn("Note: runParallel is overridden by runAllAsOne when you run all tests at once.");

    if (this.fastSkipList.length > 0 && this.runAllAsOne)
      this._logger.logWarn("Note: fastSkipList has no effect when you run all tests at once and runAllAsOne is enabled (or when debugging).");

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


