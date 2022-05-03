import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { getJunitFileUriToQueueItemMap, parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { cleanBehaveText } from './Logger';


export async function runAllAsOne(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  await runBehave(true, wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitUri);
}


export async function runScenario(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  await runBehave(false, wkspSettings, pythonExec, run, [queueItem], args, cancellation, friendlyCmd, junitUri);
}


async function runBehave(runAllAsOne: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  // in the case of runAll, we don't want to wait until the end of the run to update the tests results in the ui, 
  // so we set up a watcher so we can update results as the test files are updated on disk
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  if (runAllAsOne) {
    const map = await getJunitFileUriToQueueItemMap(queue, wkspSettings.featuresPath, junitUri);
    await vscode.workspace.fs.createDirectory(junitUri);
    updatesComplete = new Promise(function (resolve, reject) {
      watcher = startWatchingJunitFolder(resolve, reject, map, run, wkspSettings, junitUri);
    });
  }


  try {
    const wkspUri = wkspSettings.uri;
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    console.log(pythonExec, local_args.join(" "));
    const options = { cwd: wkspUri.path, env: wkspSettings.envVarList };
    const cp = spawn(pythonExec, local_args, options);

    const cancelledEvent = cancellation.onCancellationRequested(() => {
      try {
        // (note - vscode will have ended the run, so we cannot update the test status)
        config.logger.logInfo("-- TEST RUN CANCELLED --\n", wkspUri, run);
        cp.kill();
      }
      catch (e: unknown) {
        config.logger.logError(e, wkspUri, "", run);
      }
      finally {
        cancelledEvent.dispose();
        if (watcher)
          watcher.dispose();
      }
    });

    // if not runAllAsOne, we buffer the output as we go, so we can log stuff in the right order for async runs
    const out: string[] = [];
    const log = (s: string) => { if (!s) return; s = cleanBehaveText(s); if (runAllAsOne) { config.logger.logInfo(s, wkspUri) } else { out.push(s) } }

    if (runAllAsOne) {
      config.logger.logInfo("\nenv vars: " + JSON.stringify(wkspSettings.envVarList), wkspUri, run);
      config.logger.logInfo(`${friendlyCmd}\n`, wkspUri, run);
    }

    cp.stderr.on('data', chunk => log(chunk.toString()));
    cp.stdout.on('data', chunk => log(chunk.toString()));

    await new Promise((resolve) => cp.on('close', () => resolve("")));
    if (cancellation.isCancellationRequested)
      return; // cp was killed

    if (!runAllAsOne) {
      config.logger.logInfo("\n---\nenv vars: " + JSON.stringify(wkspSettings.envVarList), wkspUri, run);
      config.logger.logInfo(`${friendlyCmd}\n`, wkspUri, run);
      config.logger.logInfo(out.join(""), wkspUri, run);
    }

    config.logger.logInfo("---", wkspUri, run);

    if (runAllAsOne)
      await updatesComplete;
    else
      await parseAndUpdateTestResults(run, queue[0], wkspSettings.featuresPath, junitUri);
  }
  finally {
    if (watcher)
      watcher.dispose();
  }

}


function startWatchingJunitFolder(resolve: (value: unknown) => void, reject: (value: unknown) => void,
  map: { queueItem: QueueItem; junitFileUri: vscode.Uri; updated: boolean }[], run: vscode.TestRun, wkspSettings: WorkspaceSettings, junitUri: vscode.Uri) {

  let updated = 0;

  const updateResult = async (uri: vscode.Uri) => {
    try {
      const matches = map.filter(m => m.junitFileUri.path === uri.path);
      if (matches.length === 0)
        return reject(`could find any queue items for junit file ${uri.path}`);

      // one junit file is created per feature, so update all tests for this feature
      for (const match of matches) {
        await parseAndUpdateTestResults(run, match.queueItem, wkspSettings.featuresPath, junitUri);
        match.updated = true;
        updated++;
      }
      if (updated === map.length)
        resolve("");
    }
    catch (e: unknown) {
      config.logger.logError(e, wkspSettings.uri);
      reject(e);
    }
  }

  const pattern = new vscode.RelativePattern(junitUri, '**/*.xml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(uri => updateResult(uri));
  watcher.onDidChange(uri => updateResult(uri));

  return watcher;
}