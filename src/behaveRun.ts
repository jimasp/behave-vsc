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


async function runBehave(runAll: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  // in the case of runAll, we don't want to wait until the end of the run to update the tests in the ui, 
  // so we set up a watcher so we can update as the test files are created
  let watcher: vscode.FileSystemWatcher | undefined;
  let updatesComplete: Promise<unknown> | undefined;
  if (runAll) {
    const map = await getJunitFileUriToQueueItemMap(queue, wkspSettings.featuresPath, junitUri);
    updatesComplete = new Promise(function (resolve, reject) {
      watcher = startWatchingJunitFolder(resolve, reject, map, run, wkspSettings.featuresPath, junitUri);
    });
  }


  try {
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


    if (runAll) {
      config.logger.logInfo("\nenv vars: " + JSON.stringify(wkspSettings.envVarList));
      config.logger.logInfo(`${friendlyCmd}\n`);
    }

    // we optionally buffer up output as we go so we can log stuff in the right order for async runs
    const stdout: string[] = [];
    const logStd = (s: string) => {
      if (!s) return; if (runAll) {
        config.logger.logInfo(s)
      } else { stdout.push(s) }
    };
    const skipout: string[] = [];
    const logSkip = (s: string) => {
      if (!s) return; if (runAll) {
        config.logger.logInfo(s);
      } else { skipout.push(s); }
    }
    const stderr: string[] = [];
    const logErr = (s: string) => {
      if (!s) return; if (runAll) {
        config.logger.logError(s);
      } else { stderr.push(s); }
    }
    let err = "";

    let errStart = 0;
    let errEnd = 0;

    for await (const chunk of cp.stdout) {
      const sChunk: string = chunk.toString();
      switch (true) {
        case sChunk.startsWith("HOOK-ERROR"):
          err = sChunk.split("\n")[0].trim();
          logErr(err);
          break;
        case sChunk.startsWith("ConfigError"):
          err = sChunk.split("\n")[0].trim();
          logErr(err);
          break;
        case sChunk.includes("\x1b"):
          if (runAll) {
            errStart = sChunk.indexOf("\x1b");
            errEnd = sChunk.lastIndexOf("\x1b");
            err = sChunk.substring(errStart, errEnd);
            logErr(err);
            logStd(sChunk.replace(err, ""));
          }
          break;
      }
      logStd(sChunk);
    }

    for await (const chunk of cp.stderr) {
      const sChunk: string = chunk.toString();
      if (sChunk.startsWith("SKIP ") && sChunk.includes("Marked with @")) {
        logSkip(sChunk);
      }
      else {
        logErr(sChunk);
      }
    }

    await new Promise((resolve) => cp.on('close', () => resolve("")));
    if (cancellation.isCancellationRequested)
      return;

    if (!runAll) {
      config.logger.logInfo("\n---\nenv vars: " + JSON.stringify(wkspSettings.envVarList));
      config.logger.logInfo(`${friendlyCmd}\n`);
      config.logger.logInfo(stdout.join("").trim());
    }

    if (skipout.length > 0)
      config.logger.logInfo(skipout.join(""));

    let stderrStr = "";
    if (stderr.length > 0) {
      stderrStr = stderr.join("\n");
      stderrStr = cleanBehaveText(stderrStr).trim();
      config.logger.logError(stderrStr);
    }

    config.logger.logInfo("---");


    if (runAll)
      await updatesComplete;
    else
      // FOR ASYNC THE SAME FILE CAN BE OVERWRITTEN (MUTIPLE TIMES) BEFORE THIS EXECUTES
      await parseAndUpdateTestResults(run, queue[0], wkspSettings.featuresPath, junitUri);


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
        return reject("could not match queue item to uri"); // TODO extend info
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

  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(config.tempFilesUri, '**/*.xml'), false, false, true);
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