import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./configuration";
import { JsonFeature, parseJsonFeatures, updateTestResults } from './outputParser';
import { QueueItem } from './extension';


export async function runAll(context:vscode.ExtensionContext, pythonExec:string, run:vscode.TestRun, queue:QueueItem[], args: string[], 
  friendlyCmd:string, cancellation: vscode.CancellationToken) : Promise<void> {

  await runBehave(context, pythonExec, run, queue, args, config.workspaceFolderPath,  friendlyCmd, cancellation);
}


export async function runScenario(context:vscode.ExtensionContext, pythonExec:string, run:vscode.TestRun, queueItem:QueueItem, args: string[], 
  cancellation: vscode.CancellationToken, friendlyCmd:string) : Promise<void> {
    await runBehave(context, pythonExec, run, [queueItem], args, config.workspaceFolderPath, friendlyCmd, cancellation);
}


async function runBehave(context:vscode.ExtensionContext, pythonExec:string, run:vscode.TestRun, queue:QueueItem[], args:string[], 
  workingDirectory:string, friendlyCmd:string, cancellation: vscode.CancellationToken) : Promise<void> {

  config.logger.logInfo(`${friendlyCmd}\n`);

  const local_args = [...args];
  local_args.unshift("-m", "behave");

  const options = { cwd: workingDirectory, env: config.userSettings.envVars}; 
  
  // spawn() is old-skool async via callbacks
  const cp = spawn(pythonExec, local_args, options); 

  context.subscriptions.push(cancellation.onCancellationRequested(() => {
    // (note - vscode will have ended the run, so we cannot update the test status)
    config.logger.logInfo("-- TEST RUN CANCELLED --\n");    
    cp.kill()
  }));
  
  let loopStr = "";


  // parseJsonFeatures is expecting a full behave output string, which when 
  // behave has completed executing, looks something like this: 
  // [\n{...}\n,\nSKIP blah blah,\n{...}\n,\n {...},\nHOOK-ERROR blah blah,\n{...},\n{...}\n\n]
  // whereas chunks could be any partial buffered output of
  // the above format, for example: "\n, {..."  or  "...}]\n"
  // so our loop will adjust the format as the output comes in
  for await (const chunk of cp.stdout) {
    const sChunk = `${chunk}`; 
    config.logger.logInfo(sChunk);
    loopStr += sChunk;  

    let tmpStr = loopStr.indexOf("[") < loopStr.indexOf("{") 
       ? loopStr.replace(/((\s|\S)*?)\[/, "[") 
       : loopStr.replace(/((\s|\S)*?)\{/, "{");

    if(!tmpStr.startsWith("["))
      tmpStr = "[" + tmpStr;

    if(tmpStr.endsWith("\n"))
      tmpStr = tmpStr.slice(0, -1);

    if(!tmpStr.endsWith("]"))
      tmpStr = tmpStr + "]";

    let jFeatures:JsonFeature[];
    try {
      jFeatures = parseJsonFeatures(tmpStr);
    }
    catch {
      // this should be infrequent, (say 1/10 loops or less) or this code probably needs a tweak
      continue; 
    }

    updateTestResults(run, queue, jFeatures, false);
    loopStr = "";
  }
  

  for await (const chunk of cp.stderr) {
    const sChunk:string = chunk.toString();
    if(sChunk.startsWith("SKIP ") && sChunk.indexOf("Marked with @") !== -1)
      config.logger.logInfo(sChunk); 
    else
      config.logger.logError(sChunk)
  }    

  return await new Promise((resolve) => {
    cp.on('close', () => {
      return resolve();
    });

  });
}

