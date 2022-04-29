import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { runAllAsOne, runScenario } from './behaveRun';
import { debugScenario } from './behaveDebug';
import { QueueItem } from './extension';
import { updateTest } from './junitParser';


const shared_args = ["--junit", "--show-skipped", "--show-source", "--show-timings"];
//"--capture", "--capture-stderr", "--logcapture"]; 


export async function runBehaveAll(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queue: QueueItem[],
  cancellation: vscode.CancellationToken): Promise<void> {

  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` + `${pythonExec} -m behave`;
  const junitPath = `${config.tempFilesUri.path}/${wkspSettings.name}/${run.name}/`;
  const junitUri = vscode.Uri.file(junitPath);
  const args = shared_args.concat(["--junit", "--junit-directory", junitPath]);

  try {
    await runAllAsOne(wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitUri);
  }
  catch (e: unknown) {
    config.logger.logError(e);
  }
}



export async function runOrDebugBehaveScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  debug: boolean, cancellation: vscode.CancellationToken): Promise<void> {

  const scenario = queueItem.scenario;
  const scenarioName = scenario.scenarioName;
  const pythonExec = await config.getPythonExec(wkspSettings.uri);
  const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);
  const junitPath = `${config.tempFilesUri.path}/${wkspSettings.name}/${run.name}/`;
  const junitUri = vscode.Uri.file(junitPath);
  const args = ["-i", scenario.featureFileRelativePath, "-n", escapedScenarioName]
    .concat(shared_args).concat(["--junit", "--junit-directory", junitPath]);
  const friendlyCmd = `cd "${wkspSettings.uri.path}"\n` +
    `"${pythonExec}" -m behave -i "${scenario.featureFileRelativePath}" -n "${escapedScenarioName}"`;

  try {
    if (!debug && scenario.fastSkip) {
      config.logger.logInfo(`Fast skipping '${scenario.featureFileRelativePath}' '${scenarioName}'`);
      updateTest(run, { status: "skipped", duration: 0 }, queueItem);
      return;
    }

    if (debug) {
      await debugScenario(wkspSettings, run, queueItem, escapedScenarioName, args, cancellation, friendlyCmd, junitUri);
    }
    else {
      await runScenario(wkspSettings, pythonExec, run, queueItem, args, cancellation, friendlyCmd, junitUri);
    }
  }
  catch (e: unknown) {
    config.logger.logError(e);
  }


  function formatScenarioName(string: string, isOutline: boolean) {
    const escapeRegEx = string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (isOutline)
      return "^" + escapeRegEx + " -- @";

    return "^" + escapeRegEx + "$";
  }
}




