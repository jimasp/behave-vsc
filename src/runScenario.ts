import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
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


async function runBehave(bufferStdOut: boolean, wkspSettings: WorkspaceSettings, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {

  const local_args = [...args];
  local_args.unshift("-m", "behave");
  console.log(pythonExec, local_args.join(" "));

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


  // we optionally buffer up stdout as we go so that for async calls we can ensure that we log the friendlyCmd just above the behave output
  const stdout: string[] = [];
  const logStd = (s: string) => { if (!s) return; if (bufferStdOut) { stdout.push(s) } else { config.logger.logInfo(s) } };
  // we always buffer errors and skips and stick them at the end, as they don't come out in the correct order
  const skipout: string[] = [];
  const logSkip = (s: string) => { if (!s) return; skipout.push(s); }
  const stderr: string[] = [];
  const logErr = (s: string) => { if (!s) return; stderr.push(s); }


  // parseJsonFeatures is expecting a full behave JSON output string, which when 
  // behave has completed executing, looks something like this: 
  // [\n{...}\n,\n{...}\n,\n {...},\nHOOK-ERROR blah,\n{...},\n{...}\n\n]
  // BUT when we are using "RunAllAsOne", then chunks could be ANY partial output of
  // the above format, for example: "\n,HOOK-ERROR blah,\n{..."  or "...}]\n"
  // so our loop will adjust the format as the output comes in and see if it can parse it to a result
  let loopStr = "";
  let err = "";
  let lines: string[] = [];
  for await (const chunk of cp.stdout) {
    const sChunk = `${chunk}`;
    loopStr += sChunk;

    // logger
    switch (true) {
      case sChunk.includes("HOOK-ERROR"):
        lines = sChunk.split("\n");
        lines.forEach(line => {
          const pos = line.indexOf("HOOK-ERROR");
          if (pos !== -1) {
            err = line.substring(pos);
            logErr(err);
            logStd(line.replace(err, ""));
          }
          else if (line) {
            logStd(line);
          }
        });
        break;
      case sChunk.includes("ConfigError"):
        lines = sChunk.split("\n");
        lines.forEach(line => {
          const pos = line.indexOf("ConfigError");
          if (pos !== -1) {
            err = line.substring(pos);
            logErr(err);
            logStd(line.replace(err, ""));
          }
          else if (line) {
            logStd(line);
          }
        });
        break;
      default:
        logStd(sChunk);
    }

    // build string for parsing
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


  if (bufferStdOut) {
    config.logger.logInfo(friendlyCmd);
    config.logger.logInfo("env vars: " + wkspSettings.envVarList);
    config.logger.logInfo(stdout.join());
  }

  if (skipout.length > 0)
    config.logger.logInfo(skipout.join());

  if (stderr.length > 0)
    config.logger.logError(stderr.join("\n"));


  if (!bufferStdOut) {
    config.logger.logInfo("\nTo run this manually:");
    config.logger.logInfo("env vars: " + wkspSettings.envVarList);
    config.logger.logInfo(friendlyCmd);
  }
}

