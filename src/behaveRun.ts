import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { junitFileExists, parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { cleanBehaveText } from './Logger';


export async function runAllAsOne(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  await runBehave(false, wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd, junitUri);
}


export async function runScenario(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {
  await runBehave(true, wkspSettings, pythonExec, run, [queueItem], args, cancellation, friendlyCmd, junitUri);
}


async function runBehave(bufferStdOut: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

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
    }
  });



  // we optionally buffer up stdout as we go so that for async calls we can ensure that we log the friendlyCmd just above the behave output
  const stdout: string[] = [];
  const logStd = (s: string) => { if (!s) return; if (bufferStdOut) { stdout.push(s) } else { config.logger.logInfo(s) } };
  // we always buffer errors and skips and stick them at the end
  const skipout: string[] = [];
  const logSkip = (s: string) => { if (!s) return; config.logger.logInfo(s); skipout.push(s); }
  const stderr: string[] = [];
  const logErr = (s: string) => { if (!s) return; config.logger.logError(s); stderr.push(s); }
  let err = "";

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

  let complete = false;
  new Promise((resolve) => {
    cp.on('close', () => {
      complete = true;
      resolve("");
    });
  });

  const updated: QueueItem[] = [];
  while (!complete) {
    // poll for files as they come in so we can update the ui (so user is not waiting in the case of runAll)
    // TODO - improve this to remove updated, or (more complex) use a filesystemwatcher
    // TODO - does this need a timeout? is it possible for it to loop forever (prolly not?)
    for (const queueItem of queue) {
      if (updated.includes(queueItem))
        continue;
      if (await junitFileExists(queueItem, wkspSettings.featuresPath, junitUri)) {
        await parseAndUpdateTestResults(run, queueItem, wkspSettings.featuresPath, junitUri);
        updated.push(queueItem);
        await new Promise(t => setTimeout(t, 10));
      }
    }
  }


  try {
    for (const queueItem of queue.filter(qi => !updated.includes(qi))) {
      await parseAndUpdateTestResults(run, queueItem, wkspSettings.featuresPath, junitUri);
    }
  }
  finally { // if we get an error reading the junit file, we still want to log behave's stdout/stderr

    if (bufferStdOut) {
      // output first
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

    if (bufferStdOut)
      config.logger.logInfo("---");

    if (!bufferStdOut) {
      // output last
      config.logger.logInfo("\nenv vars: " + JSON.stringify(wkspSettings.envVarList));
      config.logger.logInfo(`${friendlyCmd}\n`);
    }
  }

}
