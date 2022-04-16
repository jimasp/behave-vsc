import * as vscode from 'vscode';
import config, { WorkspaceSettings } from "./configuration";
import { runAll, runScenario } from './runScenario';
import { debugScenario } from './debugScenario';
import { QueueItem } from './extension';
import { updateTest } from './outputParser';


const shared_args = [
  "-f", "json", "--no-summary", "--no-snippets", "--show-skipped", "--no-junit",
  "--capture", "--capture-stderr", "--logcapture", "--show-source", "--show-timings",
];


export async function runBehaveAll(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queue: QueueItem[],
  cancellation: vscode.CancellationToken): Promise<void> {

  const pythonExec = await config.getPythonExec(wkspSettings.workspaceUri);
  const friendlyCmd = `${pythonExec} -m behave`;

  try {
    await runAll(wkspSettings, pythonExec, run, queue, shared_args, cancellation, friendlyCmd);
  }
  catch (e: unknown) {
    config.logger.logError(e);
  }
}



export async function runOrDebugBehaveScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  debug: boolean, cancellation: vscode.CancellationToken): Promise<void> {

  const scenario = queueItem.scenario;
  const scenarioName = scenario.scenarioName;
  const pythonExec = await config.getPythonExec(wkspSettings.workspaceUri);
  const escapedScenarioName = formatScenarioName(scenarioName, queueItem.scenario.isOutline);
  const args = ["-i", scenario.featureFileRelativePath, "-n", escapedScenarioName].concat(shared_args);
  const friendlyCmd = `"${pythonExec}" -m behave -i "${scenario.featureFileRelativePath}" -n "${escapedScenarioName}"`;

  if (!debug && scenario.fastSkip) {
    config.logger.logInfo(`Fast skipping '${scenario.featureFileRelativePath}' '${scenarioName}'`);
    updateTest(run, { status: "skipped", duration: 0 }, queueItem);
    return;
  }

  try {
    if (debug) {
      await debugScenario(wkspSettings, run, queueItem, escapedScenarioName, args, cancellation, friendlyCmd);
    }
    else {
      await runScenario(wkspSettings, pythonExec, run, queueItem, args, cancellation, friendlyCmd);
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




