import * as vscode from 'vscode';
import { performance } from 'perf_hooks';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { getJunitFileUriToQueueItemMap, parseAndUpdateTestResults } from '../parsing/junitParser';
import { QueueItem } from '../extension';
import { cleanBehaveText, uriMatchString, isBehaveExecutionError } from '../common';
import { diagLog } from '../logger';
import { cancelTestRun } from './testRunHandler';



export async function runAllAsOne(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri): Promise<void> {

  await runBehave(true, false, wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitDirUri);
}


export async function runScenario(async: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  runToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri: vscode.Uri): Promise<void> {

  await runBehave(false, async, wkspSettings, pythonExec, run, [queueItem], args, runToken, friendlyCmd, junitDirUri, junitFileUri);
}


// note - (via logic in runWorkspaceQueue) runAllAsOne will also be true here if the runAllAsOne
// workspace setting is true and there is only a single test in the entire workspace 
async function runBehave(runAllAsOne: boolean, async: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  runToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri?: vscode.Uri): Promise<void> {

  // in the case of runAllAsOne, we don't want to wait until the end of the run to update the tests results in the UI, 
  // so we set up a watcher so we can update results as they come in, i.e. as the test files are updated on disk
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  const wkspUri = wkspSettings.uri;
  if (runAllAsOne) {
    await vscode.workspace.fs.createDirectory(junitDirUri);
    diagLog(`run ${run.name} - created junit directory ${junitDirUri.fsPath}`, wkspUri);

    updatesComplete = new Promise(function (resolve, reject) {
      diagLog(`run ${run.name} - creating filesystemwatcher for junit directory ${junitDirUri.fsPath}`, wkspUri);
      watcher = startWatchingJunitFolder(resolve, reject, queue, run, wkspSettings, junitDirUri, runToken);
    });
  }


  let cp: ChildProcess;
  const cancellationHandler = runToken.onCancellationRequested(() => {
    cp?.kill();
  });


  try {
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    diagLog(`${pythonExec} ${local_args.join(" ")}`, wkspUri);
    const env = { ...process.env, ...wkspSettings.envVarOverrides };
    const options: SpawnOptions = { cwd: wkspUri.fsPath, env: env };
    const start = performance.now();
    cp = spawn(pythonExec, local_args, options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${pythonExec} ${local_args.join(" ")}\n` +
      `working directory:${wkspUri.fsPath}\nenv var overrides: ${JSON.stringify(wkspSettings.envVarOverrides)}`;
    }

    const asyncBuff: string[] = [];
    const log = (str: string) => {
      if (!str)
        return;
      str = cleanBehaveText(str);
      if (async)
        asyncBuff.push(str);
      else
        config.logger.logInfoNoLF(str, wkspUri);
    }

    let behaveExecutionError = false;
    cp.stderr?.on('data', chunk => {
      const str = chunk.toString();
      log(str);
      // most stderr is stuff like "SKIP", "HOOK-ERROR", or missing step definitions, which will be visible in the UI, 
      // but if there's an execution error with a test, we won't get any junit output, so we set a flag which we handle later
      if (isBehaveExecutionError(str)) {
        // fatal behave error (i.e. there will be no junit output)
        behaveExecutionError = true;
        config.logger.show(wkspUri);
      }
    });
    cp.stdout?.on('data', chunk => {
      const str = chunk.toString();
      // some errors come via stdout, e.g. ParserError if you have no feature before a scenario
      if (isBehaveExecutionError(str)) {
        // fatal behave error (i.e. there will be no junit output)
        behaveExecutionError = true;
        config.logger.show(wkspUri);
      }
      log(str);
    });


    if (!async)
      config.logger.logInfo(`\n${friendlyCmd}\n`, wkspUri, run);

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (asyncBuff.length > 0) {
      config.logger.logInfo(`\n---\n${friendlyCmd}\n`, wkspUri, run);
      config.logger.logInfo(asyncBuff.join("").trim(), wkspUri, run);
      config.logger.logInfo("---", wkspUri, run);
    }

    if (runToken.isCancellationRequested) {
      config.logger.logInfo(`\n-- TEST RUN ${run.name} CANCELLED --`, wkspUri, run);
      // the test run will have been terminated, so we cannot update the test result                  
      return;
    }


    if (runAllAsOne) {
      if (behaveExecutionError) {
        // in the case of runAllAsOne having an execution error, fail all the tests
        for (const queueItem of queue) {
          await parseAndUpdateTestResults(false, behaveExecutionError, wkspSettings, undefined, run, queueItem, runToken);
        }
      }
      else {
        // because the run ends when all instances of this function have returned, we need to make sure 
        // that all tests have been updated before returning (you can't update a test when the run has ended)              
        diagLog(`run ${run.name} - waiting for all junit results to update from filesystemwatcher...`, wkspUri);
        await updatesComplete;
        diagLog(`run ${run.name} - all junit result updates complete`, wkspUri);
      }
    }
    else {
      if (!junitFileUri)
        throw new Error("junitFileUri must be supplied for single test behave execution");
      let actualDuration;
      if (!async) // parallel test durations would be misleading as there is contention, so for those we use behave's duration
        actualDuration = performance.now() - start;
      await parseAndUpdateTestResults(false, behaveExecutionError, wkspSettings, junitFileUri, run, queue[0], runToken, actualDuration);
      if (behaveExecutionError)
        cancelTestRun("runBehave (behave execution error)");
    }
  }
  finally {
    watcher?.dispose();
    cancellationHandler.dispose();
  }

}


function startWatchingJunitFolder(resolve: (value: unknown) => void, reject: (value: unknown) => void,
  queue: QueueItem[], run: vscode.TestRun, wkspSettings: WorkspaceSettings,
  junitDirUri: vscode.Uri, runToken: vscode.CancellationToken): vscode.FileSystemWatcher {

  const updateResult = async (uri: vscode.Uri) => {
    try {
      diagLog(`${run.name} - updateResult called for uri ${uri.path}`, wkspSettings.uri);

      const matches = map.filter(m => uriMatchString(m.junitFileUri) === uriMatchString(uri));
      if (matches.length === 0)
        throw `could not find any matching test items for junit file ${uri.fsPath}`;

      // one junit file is created per feature (for non-parallel runs), so update all tests for this feature
      for (const match of matches) {
        await parseAndUpdateTestResults(false, false, wkspSettings, match.junitFileUri, run, match.queueItem, runToken);
        match.updated = true;
        updated++;
        diagLog(`run ${run.name} - updated result for ${match.queueItem.test.id}, updated count=${updated}, total queue ${map.length}`, wkspSettings.uri);
      }
      if (updated === map.length)
        resolve("");
    }
    catch (e: unknown) {
      // entry point function (handler) - show error   
      cancelTestRun("startWatchingJunitFolder (error)");
      config.logger.showError(e, wkspSettings.uri);
      reject(e);
    }
  }


  let updated = 0;
  const map = getJunitFileUriToQueueItemMap(queue, wkspSettings.workspaceRelativeFeaturesPath, junitDirUri);
  const pattern = new vscode.RelativePattern(junitDirUri, '*.xml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, true, true);
  watcher.onDidCreate(uri => updateResult(uri));

  diagLog(`${run.name} - filesystemwatcher watching junit directory ${junitDirUri.fsPath}/*.xml`, wkspSettings.uri);
  return watcher;
}