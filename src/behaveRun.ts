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
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<string> {

  return await runBehave(false, wkspSettings, pythonExec, run, [queueItem], args, cancellation, friendlyCmd, junitUri);
}


async function runBehave(runAllAsOne: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<string> {

  // in the case of runAll, we don't want to wait until the end of the run to update the tests results in the ui, 
  // so we set up a watcher so we can update results as the test files are updated on disk
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  if (runAllAsOne) {
    const map = await getJunitFileUriToQueueItemMap(queue, wkspSettings.featuresPath, junitUri);
    await vscode.workspace.fs.createDirectory(junitUri);
    updatesComplete = new Promise(function (resolve, reject) {
      watcher = startWatchingJunitFolder(resolve, reject, map, run, wkspSettings.featuresPath, junitUri);
    });
  }


  try {
    let behaveErrs = "";
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    console.log(pythonExec, local_args.join(" "));
    const options = { cwd: wkspSettings.uri.path, env: wkspSettings.envVarList };
    const cp = spawn(pythonExec, local_args, options);

    const cancelledEvent = cancellation.onCancellationRequested(() => {
      try {
        // (note - vscode will have ended the run, so we cannot update the test status)
        config.logger.logInfo("-- TEST RUN CANCELLED --\n");
        cp.kill();
      }
      catch (e: unknown) {
        config.logger.logError(e);
      }
      finally {
        cancelledEvent.dispose();
        if (watcher)
          watcher.dispose();
      }
    });


    // if not runAllAsOne, we buffer the output as we go, so we can log stuff in the right order for async runs
    // we always buffer errors regardless so we can log them at the end to highlight them for runAllAsOne
    const stdout: string[] = [];
    const skipout: string[] = [];
    const stderr: string[] = [];
    const logStd = (s: string) => { if (!s) return; if (runAllAsOne) { config.logger.logInfo(s) } else { stdout.push(s) } }
    const logSkip = (s: string) => { if (!s) return; if (runAllAsOne) { config.logger.logInfo(s); } else { skipout.push(s); } }
    const logErr = (s: string) => { if (!s) return; stderr.push(s); }


    if (runAllAsOne) {
      config.logger.logInfo("\nenv vars: " + JSON.stringify(wkspSettings.envVarList));
      config.logger.logInfo(`${friendlyCmd}\n`);
    }

    let err = "";

    for await (const chunk of cp.stderr) {
      const sChunk: string = chunk.toString();
      if (sChunk.startsWith("SKIP ") && sChunk.includes("Marked with @")) {
        logSkip(sChunk);
      }
      else {
        logErr(sChunk);
      }
    }

    for await (const chunk of cp.stdout) {

      const sChunk: string = cleanBehaveText(chunk.toString());
      logStd(sChunk);

      switch (true) {
        case sChunk.includes("HOOK-ERROR"):
          err = cleanBehaveText(sChunk);
          err = sChunk.substring(sChunk.indexOf("HOOK-ERROR")).split("\n")[0];
          logErr(err);
          break;
        case sChunk.includes("ConfigError"):
          err = sChunk.substring(sChunk.indexOf("ConfigError")).split("\n")[0];
          logErr(err);
          break;
      }
    }

    await new Promise((resolve) => cp.on('close', () => resolve("")));
    if (cancellation.isCancellationRequested)
      return "";

    if (!runAllAsOne) {
      config.logger.logInfo("\n---\nenv vars: " + JSON.stringify(wkspSettings.envVarList));
      config.logger.logInfo(`${friendlyCmd}\n`);
      config.logger.logInfo(stdout.join(""));

      if (skipout.length > 0)
        config.logger.logInfo(skipout.join(""));
    }

    if (stderr.length > 0) {
      behaveErrs = stderr.join("\n").trim();
      config.logger.logError(behaveErrs);
    }

    config.logger.logInfo("---");

    if (runAllAsOne)
      await updatesComplete;
    else
      await parseAndUpdateTestResults(run, queue[0], wkspSettings.featuresPath, junitUri);

    if (!runAllAsOne)
      return behaveErrs; // return so one-by-one runs can combine their errors for display at the end of the output
    else
      return "";
  }
  finally {
    if (watcher)
      watcher.dispose();
  }

}


function startWatchingJunitFolder(resolve: (value: unknown) => void, reject: (value: unknown) => void,
  map: { queueItem: QueueItem; junitFileUri: vscode.Uri; updated: boolean }[], run: vscode.TestRun, featuresPath: string, junitUri: vscode.Uri) {

  let updated = 0;

  const updateResult = async (uri: vscode.Uri) => {
    try {
      const matches = map.filter(m => m.junitFileUri.path === uri.path);
      if (matches.length === 0)
        return reject(`could find any queue items for junit file ${uri.path}`);

      // one junit file is created per feature, so update all tests for this feature
      for (const match of matches) {
        await parseAndUpdateTestResults(run, match.queueItem, featuresPath, junitUri);
        match.updated = true;
        updated++;
      }
      if (updated === map.length)
        resolve("");
    }
    catch (e: unknown) {
      config.logger.logError(e);
      reject(e);
    }
  }

  const pattern = new vscode.RelativePattern(junitUri, '**/*.xml');
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  watcher.onDidCreate(async (uri) => {
    console.log("created: " + uri.path);
    await updateResult(uri);
  });

  watcher.onDidChange(async (uri) => {
    console.log("changed: " + uri.path);
    await updateResult(uri);
  });

  return watcher;
}