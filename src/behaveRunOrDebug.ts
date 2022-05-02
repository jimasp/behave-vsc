import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { runAllAsOne, runScenario } from './behaveRun';
import { debugScenario } from './behaveDebug';
import { QueueItem } from './extension';
import { updateTest } from './junitParser';



export async function runBehaveAll(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queue: QueueItem[],
  cancellation: vscode.CancellationToken): Promise<void> {

  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` + `${pythonExec} -m behave`;
  const junitPath = `${config.extTempFilesUri.path}/${run.name}/${wkspSettings.name}`;
  const junitUri = vscode.Uri.file(junitPath);
  const args = ["--junit", "--junit-directory", junitPath];

  try {
    await runAllAsOne(wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitUri);
  }
  catch (e: unknown) {
    config.logger.logError(e);
  }
}



export async function runOrDebugBehaveScenario(debug: boolean, async: boolean, wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  cancellation: vscode.CancellationToken): Promise<string> {

  const scenario = queueItem.scenario;
  const scenarioName = scenario.scenarioName;
  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);

  if (async && debug)
    throw new Error("running async debug is not supported");

  let junitPath = `${config.extTempFilesUri.path}/${run.name}/${wkspSettings.name}`;
  // a junit xml file could be updated several times for a single scenario, so we'll use a different path for each scenario
  // so that when running async we can determine which result is which
  if (async) {
    junitPath += `/${formatScenarioNameAsFolderName(scenarioName)}`;
  }
  const junitUri = vscode.Uri.file(junitPath);

  const args = ["-i", scenario.featureFileWorkspaceRelativePath, "-n", escapedScenarioName, "--junit", "--junit-directory", junitPath];

  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` +
    `"${pythonExec}" -m behave -i "${scenario.featureFileWorkspaceRelativePath}" -n "${escapedScenarioName}"`;

  try {
    if (!debug && scenario.fastSkip) {
      config.logger.logInfo(`Fast skipping '${scenario.featureFileWorkspaceRelativePath}' '${scenarioName}'`);
      updateTest(run, { status: "skipped", duration: 0 }, queueItem);
      return "";
    }

    if (debug) {
      await debugScenario(wkspSettings, run, queueItem, args, cancellation, friendlyCmd, junitUri);
      return "";
    }
    else {
      return await runScenario(wkspSettings, pythonExec, run, queueItem, args, cancellation, friendlyCmd, junitUri);
    }
  }
  catch (e: unknown) {
    config.logger.logError(e);
    return "";
  }



  function formatScenarioNameAsFolderName(scenarioName: string) {
    const valid = /[^a-zA-Z0-9_-]/g;
    return scenarioName.replaceAll(" ", "_").replace(valid, (match) => {
      return `[${match.charCodeAt(0)}]`;
    });
  }


  function formatScenarioName(string: string, isOutline: boolean) {
    const escapeRegEx = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (isOutline)
      return "^" + escapeRegEx + " -- @";

    return "^" + escapeRegEx + "$";
  }
}




