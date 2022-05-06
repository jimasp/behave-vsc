import * as vscode from 'vscode';
import * as os from 'os';
import { customAlphabet } from 'nanoid';
import config, { WIN_MAX_PATH } from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { runAllAsOne, runScenario } from './behaveRun';
import { debugScenario } from './behaveDebug';
import { QueueItem } from './extension';
import { getJunitFileUri, MaxPathError, updateTest } from './junitParser';



export async function runBehaveAll(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queue: QueueItem[],
  cancelToken: vscode.CancellationToken): Promise<void> {

  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` + `${pythonExec} -m behave`;
  const junitDirUri = vscode.Uri.file(`${config.extTempFilesUri.fsPath}/${run.name}/${wkspSettings.name}`);
  const args = ["--junit", "--junit-directory", junitDirUri.fsPath, "--capture", "--capture-stderr", "--logcapture"];

  try {
    await runAllAsOne(wkspSettings, pythonExec, run, queue, args, cancelToken, friendlyCmd, junitDirUri);
  }
  catch (e: unknown) {
    config.logger.logError(e, wkspSettings.uri, "", run);
  }
}



export async function runOrDebugBehaveScenario(debug: boolean, async: boolean, wkspSettings: WorkspaceSettings, run: vscode.TestRun,
  queueItem: QueueItem, cancelToken: vscode.CancellationToken): Promise<void> {

  const scenario = queueItem.scenario;
  const scenarioName = scenario.scenarioName;
  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);

  if (async && debug)
    throw new Error("running async debug is not supported");

  let junitDirUri = vscode.Uri.file(`${config.extTempFilesUri.fsPath}/${run.name}/${wkspSettings.name}`);

  // a junit xml file is per feature, so when each scenario is run separately the same file is updated several times.
  // behave writes "skipped" into the feature file for any test not included in each behave execution.
  // this works fine when tests are run sequentially and we read the file just after the test is run, but
  // for async we need to use a different path for each scenario so we can determine which file contains the actual result for that scenario
  if (async) {
    junitDirUri = appendScenarioNameToJunitDirUri(queueItem, wkspSettings.featuresPath, junitDirUri, scenarioName);
  }

  const junitFileUri = getJunitFileUri(queueItem, wkspSettings.featuresPath, junitDirUri);
  const args = ["-i", scenario.featureFileWorkspaceRelativePath, "-n", escapedScenarioName, "--junit", "--junit-directory", junitDirUri.fsPath];

  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` +
    `"${pythonExec}" -m behave -i "${scenario.featureFileWorkspaceRelativePath}" -n "${escapedScenarioName}"`;

  try {
    if (!debug && scenario.fastSkip) {
      config.logger.logInfo(`Fast skipping '${scenario.featureFileWorkspaceRelativePath}' '${scenarioName}'`, wkspSettings.uri, run);
      updateTest(run, { status: "skipped", duration: 0 }, queueItem);
      return;
    }

    if (debug) {
      await debugScenario(wkspSettings, run, queueItem, args, cancelToken, friendlyCmd, junitDirUri, junitFileUri);
    }
    else {
      await runScenario(async, wkspSettings, pythonExec, run, queueItem, args, cancelToken, friendlyCmd, junitDirUri, junitFileUri);
    }
  }
  catch (e: unknown) {
    config.logger.logError(e, wkspSettings.uri, "", run);
  }

}

function formatScenarioName(string: string, isOutline: boolean) {
  const escapeRegEx = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (isOutline)
    return "^" + escapeRegEx + " -- @";

  return "^" + escapeRegEx + "$";
}


function appendScenarioNameToJunitDirUri(queueItem: QueueItem, featuresPath: string, junitDirUri: vscode.Uri, scenarioName: string): vscode.Uri {

  const escape = "#^@";
  const nid = customAlphabet("1234567890abcdef", 5)();
  const allPlatformsValidFolderNameChars = /[^a-zA-Z0-9_\\.\\-]/g;
  let scenarioFolderName = scenarioName.replaceAll(" ", "_").replace(allPlatformsValidFolderNameChars, () => escape);

  if (scenarioFolderName.includes(escape)) {
    scenarioFolderName = scenarioFolderName.replaceAll(escape, "X");
    scenarioFolderName += "_" + nid; // ensure unique after replacing special characters
  }

  if (os.platform() !== "win32")
    return vscode.Uri.joinPath(junitDirUri, scenarioFolderName);

  // windows, so check if max path would be breached by junit file fspath
  const junitFileUri = getJunitFileUri(queueItem, featuresPath, junitDirUri, true);
  const diff = junitFileUri.fsPath.length - WIN_MAX_PATH;
  if (diff <= 0)
    return junitFileUri;

  // see if shortening the scenario folder name could fix the path length issue
  if (diff >= scenarioFolderName.length + nid.length)
    throw `windows max path exceeded while trying to build path to junit file: ${junitFileUri.fsPath}`;

  // shorten it
  scenarioFolderName = scenarioFolderName.replace(nid, "");
  scenarioFolderName = scenarioFolderName.slice(0, scenarioFolderName.length - diff - 1);
  scenarioFolderName += "_" + nid;

  return vscode.Uri.joinPath(junitDirUri, scenarioFolderName);
}







