import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./configuration";
import { JsonFeature, parseJsonFeatures, updateTestResults } from './outputParser';
import { QueueItem } from './extension';


export async function runAll(context: vscode.ExtensionContext, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  friendlyCmd: string, cancellation: vscode.CancellationToken): Promise<void> {

  await runBehave(context, pythonExec, run, queue, args, config.workspaceFolderPath, friendlyCmd, cancellation);
}


export async function runScenario(context: vscode.ExtensionContext, pythonExec: string, run: vscode.TestRun, queueItem: QueueItem, args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {
  await runBehave(context, pythonExec, run, [queueItem], args, config.workspaceFolderPath, friendlyCmd, cancellation);
}


async function runBehave(context: vscode.ExtensionContext, pythonExec: string, run: vscode.TestRun, queue: QueueItem[], args: string[],
  workingDirectory: string, friendlyCmd: string, cancellation: vscode.CancellationToken): Promise<void> {

  config.logger.logInfo(`${friendlyCmd}\n`);

  const local_args = [...args];
  local_args.unshift("-m", "behave");

  const options = { cwd: workingDirectory, env: config.userSettings.envVarList };

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


  // parseJsonFeatures is expecting a full behave JSON output string, which when 
  // behave has completed executing, looks something like this: 
  // [\n{...}\n,\n{...}\n,\n {...},\nHOOK-ERROR blah,\n{...},\n{...}\n\n]
  // BUT when we are using "RunAllAsOne", then chunks could be ANY partial output of
  // the above format, for example: "\n,HOOK-ERROR blah,\n{..."  or  "...}]\n"
  // so our loop will adjust the format as the output comes in and see if it can parse it to a result
  let loopStr = "";
  for await (const chunk of cp.stdout) {
    const sChunk = `${chunk}`;
    loopStr += sChunk;

    if (sChunk.indexOf("HOOK-ERROR") !== -1)
      config.logger.logError(sChunk.split("\n")[0]);
    else
      config.logger.logInfo(sChunk);

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
    if (sChunk.startsWith("SKIP ") && sChunk.indexOf("Marked with @") !== -1)
      config.logger.logInfo(sChunk);
    else
      config.logger.logError(sChunk)
  }

  return await new Promise((resolve) => cp.on('close', () => resolve()));
}

