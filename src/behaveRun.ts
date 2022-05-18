import * as vscode from 'vscode';
import * as fs from 'fs';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { config } from "./Configuration";
import { WorkspaceSettings } from "./settings";
import { getJunitFileUriToQueueItemMap, parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { cleanBehaveText, WkspError } from './common';


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

  // in the case of runAllAsOne, we don't want to wait until the end of the run to update the tests results in the ui, 
  // so we set up a watcher so we can update results as the test files are updated on disk
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  if (runAllAsOne) {
    const map = await getJunitFileUriToQueueItemMap(queue, wkspSettings.workspaceRelativeFeaturesPath, junitDirUri);
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
    console.log(pythonExec, local_args.join(" "));
    const options: SpawnOptions = { cwd: wkspUri.fsPath, env: wkspSettings.envVarList };
    cp = spawn(pythonExec, local_args, options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${pythonExec} ${local_args}\n` +
      `working directory:${wkspUri.fsPath}\nenv vars: ${JSON.stringify(wkspSettings.envVarList)}`;
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

    cp.stderr?.on('data', chunk => log(chunk.toString()));
    cp.stdout?.on('data', chunk => log(chunk.toString()));

    if (!async) {
      config.logger.logInfo("\nenv vars: " + JSON.stringify(wkspSettings.envVarList), wkspUri, run);
      config.logger.logInfo(`${friendlyCmd}\n`, wkspUri, run);
    }

    await new Promise((resolve) => cp.on('close', () =>
      resolve("")
    ));


    if (asyncBuff.length > 0) {
      config.logger.logInfo("\n---\nenv vars: " + JSON.stringify(wkspSettings.envVarList), wkspUri, run);
      config.logger.logInfo(`${friendlyCmd}\n`, wkspUri, run);
      config.logger.logInfo(asyncBuff.join("").trim(), wkspUri, run);
      config.logger.logInfo("---", wkspUri, run);
    }

    if (runToken.isCancellationRequested) {
      config.logger.logInfo(`\n-- TEST RUN ${run.name} CANCELLED --`, wkspUri, run);
      // the test run will have been terminated, so we cannot update the test status                  
      return;
    }


    // because the run ends when all instances of this function have returned, we need to make sure 
    // that all test have been updated before we return (you can't update a test when the run has ended)
    if (runAllAsOne) {
      await updatesComplete;
    }
    else {
      if (!junitFileUri)
        throw new Error("junitFileUri not supplied");
      await parseAndUpdateTestResults(junitFileUri, run, queue[0], wkspSettings.workspaceRelativeFeaturesPath, runToken);
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

  // create the junitDirUri directory 
  // NOTE - we use "fs.mkdirSync" because "await vscode.workspace.fs.createDirectory" is not reliable atm, it causes watcher to 
  // fail to pick up on first files created (intermittently observed with multi-root in example-project-1)
  fs.mkdirSync(junitDirUri.fsPath, { recursive: true });

  const updateResult = async (uri: vscode.Uri) => {
    try {
      const matches = map.filter(m => m.junitFileUri.path === uri.path);
      if (matches.length === 0)
        return reject(`could not find any matching test items for junit file ${uri.path}`);

      // one junit file is created per feature (for non-parallel runs), so update all tests for this feature
      for (const match of matches) {
        await parseAndUpdateTestResults(match.junitFileUri, run, match.queueItem, wkspSettings.workspaceRelativeFeaturesPath, runToken);
        match.updated = true;
        console.log(`updated result for ${match.queueItem.test.id}, updated count=${updated}, total queue ${map.length}`);
        updated++;
      }
      if (updated === map.length)
        resolve("");
    }
    catch (e: unknown) {
      const err = new WkspError(e, wkspSettings.uri);
      config.logger.logError(err);
      reject(e);
    }
  }

  const pattern = new vscode.RelativePattern(junitDirUri, '**/*.xml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(uri => updateResult(uri));
  watcher.onDidChange(uri => updateResult(uri));

  return watcher;

}