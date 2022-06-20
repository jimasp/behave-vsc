import * as vscode from 'vscode';
import * as os from 'os';
import { config } from "./configuration";
import { WorkspaceSettings } from "./settings";
import { runAllAsOne, runScenario } from './behaveRun';
import { debugScenario } from './behaveDebug';
import { QueueItem } from './extension';
import { getJunitFileUri, updateTest } from './junitParser';
import { rndAlphaNumeric, WIN_MAX_PATH, WkspError } from './common';
import { cancelTestRun } from './testRunHandler';


// hard-code any settings we MUST have (i.e. override user behave.ini file only where absolutely necessary)
const override_args = [
  "--show-skipped" // required for skipped tests to produce junit output 
];

export async function runBehaveAll(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queue: QueueItem[],
  cancelToken: vscode.CancellationToken): Promise<void> {

  const pythonExec = await config.getPythonExecutable(wkspSettings.uri, wkspSettings.name);
  const friendlyEnvVars = getFriendlyEnvVars(wkspSettings);

  let ps1 = "", ps2 = "";
  if (os.platform() === "win32") {
    ps1 = `powershell commands:\n`;
    ps2 = "& ";
  }

  const friendlyCmd = `${ps1}cd "${wkspSettings.uri.fsPath}"\n${friendlyEnvVars}${ps2}"${pythonExec}" -m behave ${override_args.join(" ")}`;
  const junitDirUri = getJunitWkspRunDirUri(run.name, wkspSettings.name);
  const args = [...override_args, "--junit", "--junit-directory", junitDirUri.fsPath];

  await runAllAsOne(wkspSettings, pythonExec, run, queue, args, cancelToken, friendlyCmd, junitDirUri);
}



export async function runOrDebugBehaveScenario(debug: boolean, async: boolean, wkspSettings: WorkspaceSettings, run: vscode.TestRun,
  queueItem: QueueItem, cancelToken: vscode.CancellationToken): Promise<void> {
  try {
    if (async && debug)
      throw new Error("running async debug is not supported");

    const scenario = queueItem.scenario;
    const scenarioName = scenario.scenarioName;
    const pythonExec = await config.getPythonExecutable(wkspSettings.uri, wkspSettings.name);
    const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);
    const friendlyEnvVars = getFriendlyEnvVars(wkspSettings);

    let ps1 = "", ps2 = "";
    if (os.platform() === "win32") {
      ps1 = `powershell commands:\n`;
      ps2 = "& ";
    }

    let junitDirUri = getJunitWkspRunDirUri(run.name, wkspSettings.name);
    // a junit xml file is per feature, so when each scenario is run separately the same file is updated several times.
    // behave writes "skipped" into the junit file for any scenario not included in each behave execution.
    // this approach works ok when tests are run sequentially and we read the junit file after each test is run, but
    // for async we need to use a different path for each scenario so we can determine which file contains 
    // the actual result for that scenario.
    if (async)
      junitDirUri = getJunitUriDirForAsyncScenario(queueItem, wkspSettings.workspaceRelativeFeaturesPath, junitDirUri, scenarioName);

    const junitFileUri = getJunitFileUri(queueItem, wkspSettings.workspaceRelativeFeaturesPath, junitDirUri);
    const args = [
      ...override_args, "-i", scenario.featureFileWorkspaceRelativePath, "-n", escapedScenarioName,
      "--junit", "--junit-directory", junitDirUri.fsPath
    ];

    const friendlyCmd = `${ps1}cd "${wkspSettings.uri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${pythonExec}" -m behave ${override_args.join(" ")} ` +
      `-i "${scenario.featureFileWorkspaceRelativePath}" -n "${escapedScenarioName}"`;

    if (!debug && scenario.fastSkipTag) {
      config.logger.logInfo(`Fast skipping '${scenario.featureFileWorkspaceRelativePath}' '${scenarioName}'`, wkspSettings.uri, run);
      updateTest(run, { status: "skipped", duration: 0 }, queueItem);
      return;
    }

    if (debug) {
      await debugScenario(wkspSettings, run, queueItem, args, cancelToken, friendlyCmd, junitFileUri);
    }
    else {
      await runScenario(async, wkspSettings, pythonExec, run, queueItem, args, cancelToken, friendlyCmd, junitDirUri, junitFileUri);
    }
  }
  catch (e: unknown) {
    cancelTestRun("runOrDebugBehaveScenario");
    // unawaited (if runParallel) async func, must log the error 
    throw new WkspError(e, wkspSettings.uri, run);
  }

}

function getFriendlyEnvVars(wkspSettings: WorkspaceSettings) {
  let envVars = "";

  for (const [name, value] of Object.entries(wkspSettings.envVarOverrides)) {

    if (os.platform() === "win32")
      envVars += typeof value === "number" ? `$Env:${name}=${value}\n` : `$Env:${`${name}="${value.replace('"', '""')}"`}\n`;
    else
      envVars += typeof value === "number" ? `${name}=${value} ` : `${name}="${value.replace('"', '\\"')}" `;
  }

  return envVars;
}

function formatScenarioName(string: string, isOutline: boolean) {
  const escapeRegEx = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (isOutline)
    return "^" + escapeRegEx + " -- @";

  return "^" + escapeRegEx + "$";
}

function getJunitWkspRunDirUri(runName: string | undefined, wkspName: string): vscode.Uri {
  if (!runName)
    throw "runName is undefined";
  return vscode.Uri.joinPath(config.extensionTempFilesUri, "junit", runName, wkspName);
}

function getJunitUriDirForAsyncScenario(queueItem: QueueItem, wkspRelativeFeaturesPath: string, junitDirUri: vscode.Uri, scenarioName: string): vscode.Uri {

  const nidSuffix = "_" + rndAlphaNumeric();
  let scenarioFolderName = scenarioName.replaceAll(" ", "_");
  const allPlatformsValidFolderNameChars = /[^ a-zA-Z0-9_.-]/g;
  if (allPlatformsValidFolderNameChars.test(scenarioFolderName)) {
    scenarioFolderName = scenarioFolderName.replace(allPlatformsValidFolderNameChars, "X");
    scenarioFolderName += nidSuffix; // ensure unique after replacing invalid folder name characters    
  }


  let scenJunitDirUri = vscode.Uri.joinPath(junitDirUri, scenarioFolderName);
  if (os.platform() !== "win32")
    return scenJunitDirUri;

  // windows, so check if max path would be breached by junit file fspath
  const junitFileUri = getJunitFileUri(queueItem, wkspRelativeFeaturesPath, scenJunitDirUri, true);
  const filePathDiff = junitFileUri.fsPath.length - WIN_MAX_PATH;
  if (filePathDiff <= 0)
    return scenJunitDirUri;

  // remove the suffix if it got added above (standardise for subsequent operations)
  scenarioFolderName = scenarioFolderName.replace(nidSuffix, "");

  // see if shortening the scenario folder name could fix the path length issue
  // (+1 because the suffix includes "_" and if the scenarioFolderName starts or ends with "_" it gets removed below)  
  if (filePathDiff >= scenarioFolderName.length + nidSuffix.length + 1)
    throw `windows max path exceeded while trying to build path to junit file: ${junitFileUri.fsPath} `;

  // shorten it and rebuild scenJunitDirUri from junitDirUri
  scenarioFolderName = scenarioFolderName.slice(0, scenarioFolderName.length - filePathDiff - nidSuffix.length);
  scenarioFolderName += nidSuffix;
  scenarioFolderName.replace(/^_/, "").replace(/_$/, "");
  scenJunitDirUri = vscode.Uri.joinPath(junitDirUri, scenarioFolderName);

  return scenJunitDirUri;
}


