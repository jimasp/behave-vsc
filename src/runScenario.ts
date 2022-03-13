import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./configuration";
import { parseOutputAndUpdateTestResults } from './outputParser';
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
  cp.stdout.setEncoding('utf8');

  context.subscriptions.push(cancellation.onCancellationRequested(() => {
    // (note - vscode will have ended the run, so we cannot update the test status)
    config.logger.logInfo("-- TEST RUN CANCELLED --\n");    
    cp.kill()
  }));
  
  let loopStr = "";

  for await (const chunk of cp.stdout) {
    const sChunk = `${chunk}`; 
    config.logger.logInfo(sChunk);
    loopStr += sChunk;  

    let tmpStr = loopStr.indexOf("[") < loopStr.indexOf("{") 
      ? loopStr.replace(/((\s|\S)*?)\[/, "[") 
      : loopStr.replace(/((\s|\S)*?)\{/, "{");

    if(tmpStr.endsWith("\n"))
      tmpStr = tmpStr.substring(0, tmpStr.length-1);

    if(!tmpStr.startsWith("["))
      tmpStr = "[" + tmpStr;

    if(!tmpStr.endsWith("]"))
      tmpStr = tmpStr + "]";

    try {
      JSON.parse(tmpStr);
    }
    catch {
      continue; // until parseable
    }

    parseOutputAndUpdateTestResults(run, queue, tmpStr, false);
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

