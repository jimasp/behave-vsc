import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config, { WorkspaceSettings } from "./configuration";
import { JsonFeature, parseJsonFeatures, updateTestResults } from './outputParser';
import { QueueItem } from './extension';


export async function runAllAsOne(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {

  await runBehave(false, wkspSettings, pythonExec, run, queue, args, cancellation, friendlyCmd);
}


export async function runScenario(wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {
  await runBehave(true, wkspSettings, pythonExec, run, [queueItem], args, cancellation, friendlyCmd);
}


async function runBehave(bufferLogOutput: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {


  const local_args = [...args];
  local_args.unshift("-m", "behave");

  const options = { cwd: wkspSettings.uri.path, env: wkspSettings.envVarList };

  // spawn() is old-skool async via callbacks
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


  // we buffer up log output as we go so that for async calls we can ensure that we log the friendlyCmd just above the behave output
  const stdout: string[] = [];
  const skipout: string[] = [];
  const stderr: string[] = [];

  const logStd = (out: string) => { if (bufferLogOutput) { stdout.push(out) } else { config.logger.logInfo(out) } };
  const logSkip = (out: string) => { if (bufferLogOutput) { skipout.push(out) } else { config.logger.logInfo(out) } };
  const logErr = (err: string) => { if (bufferLogOutput) { stderr.push(err) } else { config.logger.logError(err) } };

  // parseJsonFeatures is expecting a full behave JSON output string, which when 
  // behave has completed executing, looks something like this: 
  // [\n{...}\n,\n{...}\n,\n {...},\nHOOK-ERROR blah,\n{...},\n{...}\n\n]
  // BUT when we are using "RunAllAsOne", then chunks could be ANY partial output of
  // the above format, for example: "\n,HOOK-ERROR blah,\n{..."  or "...}]\n"
  // so our loop will adjust the format as the output comes in and see if it can parse it to a result
  let loopStr = "";
  let err = "";
  for await (const chunk of cp.stdout) {
    const sChunk = `${chunk}`;
    loopStr += sChunk;

    switch (true) {
      case sChunk.includes("HOOK-ERROR"):
        err = sChunk.split("\n")[0];
        logErr(err);
        break;
      case sChunk.includes("ConfigError"):
        err = sChunk.split("\n")[0];
        logErr(err);
        break;
      default:
        logStd(sChunk);
    }


    let tmpStr = loopStr.indexOf("[") < loopStr.indexOf("{")
      ? loopStr.replace(/((\s|\S)*?)\[/, "[")
      : loopStr.replace(/((\s|\S)*?)\{/, "{");

    if (tmpStr.endsWith("\r\n"))
      tmpStr = tmpStr.slice(0, -2);
    else if (tmpStr.endsWith("\n"))
      tmpStr = tmpStr.slice(0, -1);

    if (!tmpStr.startsWith("["))
      tmpStr = "[" + tmpStr;

    if (!tmpStr.endsWith("]"))
      tmpStr = tmpStr + "]";

    let jFeatures: JsonFeature[];
    try {
      jFeatures = parseJsonFeatures(tmpStr);
    }
    catch {
      // if the above code is correct, then we should *rarely* hit continue, 
      // i.e. ONLY if/when behave gives us output that splits a feature result, 
      // for example when we only have the output: ..."status":"pa  when we need:  ..."status":"passed"}]}
      // (or also when the last behave output is \n] on it's own)
      continue;
    }

    updateTestResults(run, queue, jFeatures, false);
    loopStr = "";
  }


  for await (const chunk of cp.stderr) {
    const sChunk: string = chunk.toString();
    if (sChunk.startsWith("SKIP ") && sChunk.includes("Marked with @")) {
      logSkip(sChunk);
    }
    else {
      logStd(sChunk);
      logErr(sChunk);
    }
  }


  await new Promise((resolve) => cp.on('close', () => resolve("")));

  if (bufferLogOutput) {
    config.logger.logInfo(friendlyCmd);
    config.logger.logInfo(stdout.join());
    config.logger.logInfo(skipout.join());
    if (stderr.length > 0)
      config.logger.logError(stderr.join());
  }
}

