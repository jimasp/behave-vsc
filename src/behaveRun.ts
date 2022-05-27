import * as vscode from 'vscode';
import * as fs from 'fs';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { config } from "./Configuration";
import { WorkspaceSettings } from "./settings";
import { getJunitFileUriToQueueItemMap, parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { cleanBehaveText, isFatalBehaveError, WkspError } from './common';
import { diagLog } from './Logger';
import { cancelTestRun } from './testRunHandler';


export async function runAllAsOne(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri): Promise<void> {

  await runBehave(true, false, wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitDirUri);
}


export async function runScenario(async: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  runToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri: vscode.Uri): Promise<void> {

  await runBehave(false, async, wkspSettings, pythonExec, run, [queueItem], args, runToken, friendlyCmd, junitDirUri, junitFileUri);
}


async function runBehave(runAllAsOne: boolean, async: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  runToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri?: vscode.Uri): Promise<void> {

  const wkspUri = wkspSettings.uri;

  // note - (via logic in runWorkspaceQueue) runAllAsOne will also be true here 
  // if the runAllAsOne setting is true and there is only one test in the entire workspace 

  // in the case of runAllAsOne, we don't want to wait until the end of the run to update the tests results in the UI, 
  // so we set up a watcher so we can update results as they come in, i.e. as the test files are updated on disk
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  if (runAllAsOne) {
    const map = await getJunitFileUriToQueueItemMap(queue, wkspSettings.workspaceRelativeFeaturesPath, junitDirUri);
    await vscode.workspace.fs.createDirectory(junitDirUri);
    diagLog(`run ${run.name} - created junit directory ${junitDirUri.fsPath}`, wkspUri);
    updatesComplete = new Promise(function (resolve, reject) {
      watcher = startWatchingJunitFolder(resolve, reject, map, run, wkspSettings, junitDirUri, runToken);
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
    const env = { ...process.env, ...wkspSettings.envVarList };
    const options: SpawnOptions = { cwd: wkspUri.fsPath, env: env };
    cp = spawn(pythonExec, local_args, options);
    //cp = spawn("printenv", [], options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${pythonExec} ${local_args}\n` +
      `working directory:${wkspUri.fsPath}\nenv var overrides: ${JSON.stringify(wkspSettings.envVarList)}`;
    }

    const asyncBuff: string[] = [];
    const log = (str: string) => {
      if (!str)
        return;
      str = cleanBehaveText(str);
      if (async)
        asyncBuff.push(str);
      else
        config.logger.logInfoNoCR(str, wkspUri);
    }

    let hadFatalBehaveError = false; // <--flag to stop us getting stuck waiting waiting for junit files if there is a behave error (for runAllAsOne)
    cp.stderr?.on('data', chunk => {
      const str = chunk.toString();
      log(str);
      if (isFatalBehaveError(str)) {
        // fatal behave error (i.e. there will be no junit output)
        hadFatalBehaveError = true;
        config.logger.show(wkspUri);
      }
    });
    cp.stdout?.on('data', chunk => {
      const str = chunk.toString();
      log(str);
    });

    if (!async) {
      config.logger.logInfo(`\n${friendlyCmd}\n`, wkspUri, run);
    }

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (asyncBuff.length > 0) {
      config.logger.logInfo(`\n---\n${friendlyCmd}\n`, wkspUri, run);
      config.logger.logInfo(asyncBuff.join("").trim(), wkspUri, run);
      config.logger.logInfo("---", wkspUri, run);
    }

    if (runToken.isCancellationRequested) {
      config.logger.logInfo(`\n-- TEST RUN ${run.name} CANCELLED --`, wkspUri, run);
      // the test run will have been terminated, so we cannot update the test status                  
      return;
    }


    if (runAllAsOne) {
      if (hadFatalBehaveError) {
        for (const queueItem of queue) {
          await parseAndUpdateTestResults(false, hadFatalBehaveError, undefined, run, queueItem, wkspSettings.workspaceRelativeFeaturesPath, runToken);
        }
      }
      else {
        // because the run ends when all instances of this function have returned, we need to make sure 
        // that all tests have been updated before returning (you can't update a test when the run has ended)              
        diagLog(`run ${run.name} - waiting for all junit results to update...`, wkspUri);
        await updatesComplete;
        diagLog(`run ${run.name} - all junit result updates complete`, wkspUri);
      }
    }
    else {
      if (hadFatalBehaveError)
        cancelTestRun("fatal behave error");
      if (!junitFileUri)
        throw new Error("junitFileUri must be supplied for single test behave execution");
      await parseAndUpdateTestResults(false, hadFatalBehaveError, junitFileUri, run, queue[0], wkspSettings.workspaceRelativeFeaturesPath, runToken);
    }
  }
  catch (e: unknown) {
    throw new WkspError(e, wkspUri);
  }
  finally {
    watcher?.dispose();
    cancellationHandler.dispose();
  }

}


function startWatchingJunitFolder(resolve: (value: unknown) => void, reject: (value: unknown) => void,
  map: { queueItem: QueueItem; junitFileUri: vscode.Uri; updated: boolean }[], run: vscode.TestRun, wkspSettings: WorkspaceSettings,
  junitDirUri: vscode.Uri, runToken: vscode.CancellationToken): vscode.FileSystemWatcher {

  let updated = 0;

  // verify directory exists before watching
  const exists = fs.existsSync(junitDirUri.fsPath);
  if (!exists)
    throw `directory ${junitDirUri.fsPath} does not exist`;

  const updateResult = async (uri: vscode.Uri) => {
    try {
      diagLog(`${run.name} - updateResult called for uri ${uri.path}`, wkspSettings.uri);

      const matches = map.filter(m => m.junitFileUri.path === uri.path);
      if (matches.length === 0)
        return reject(`could not find any matching test items for junit file ${uri.path}`);

      // one junit file is created per feature (for non-parallel runs), so update all tests for this feature
      for (const match of matches) {
        await parseAndUpdateTestResults(false, false, match.junitFileUri, run, match.queueItem, wkspSettings.workspaceRelativeFeaturesPath, runToken);
        match.updated = true;
        diagLog(`run ${run.name} - updated result for ${match.queueItem.test.id}, updated count=${updated}, total queue ${map.length}`, wkspSettings.uri);
        updated++;
      }
      if (updated === map.length)
        resolve("");
    }
    catch (e: unknown) {
      config.logger.showError(e, wkspSettings.uri);
      reject(e);
    }
  }

  const pattern = new vscode.RelativePattern(junitDirUri, '**/*.xml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(uri => updateResult(uri));
  watcher.onDidChange(uri => updateResult(uri));

  diagLog(`${run.name} - watching junit directory ${junitDirUri}/**/*.xml}`, wkspSettings.uri);
  return watcher;
}