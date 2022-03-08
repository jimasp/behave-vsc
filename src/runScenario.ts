import * as vscode from 'vscode';
import { spawn } from 'child_process';
import config from "./configuration";
import { parseOutputAndUpdateAllTestResults, parseOutputAndUpdateTestResult } from './outputParser';
import { QueueItem } from './extension';


export async function runAll(run:vscode.TestRun, queue:QueueItem[], args: string[], cancellation: vscode.CancellationToken) : Promise<void> {
  const behaveOutput = await spawnBehave(args, config.workspaceFolderPath, cancellation);
  parseOutputAndUpdateAllTestResults(run, queue, behaveOutput);
}


export async function runScenario(run:vscode.TestRun, queueItem:QueueItem, args: string[], cancellation: vscode.CancellationToken) : Promise<void> {
  const behaveOutput = await spawnBehave(args, config.workspaceFolderPath, cancellation);
  parseOutputAndUpdateTestResult(run, queueItem, behaveOutput);
}


async function spawnBehave(args:string[], workingDirectory:string, cancellation: vscode.CancellationToken) : Promise<string> {

  const local_args = [...args];
  local_args.unshift("-m", "behave");

  const options = { cwd: workingDirectory, env: config.userSettings.envVars}; 
  let behaveOutput = "";  
  
  // spawn() is old-skool async via callbacks
  const pythonExec = await config.getPythonExec();
  const cp = spawn(pythonExec, local_args, options); 

  cancellation.onCancellationRequested(() => {
    // (note - vscode will have ended the run, so we cannot update the test status)
    config.logger.logInfo("-- TEST RUN CANCELLED --\n");    
    cp.kill()
  });
  
  for await (const chunk of cp.stdout) {
    behaveOutput += `${chunk}`; 
    config.logger.logInfo(`${chunk}`);
  }

  for await (const chunk of cp.stderr) {
    const sChunk:string = chunk.toString();
    behaveOutput += sChunk; 
    if(sChunk.startsWith("SKIP ") && sChunk.indexOf("Marked with @") !== -1)
      config.logger.logInfo(sChunk); 
    else
      config.logger.logError(sChunk)
  }    

  return await new Promise((resolve) => {

    cp.on('close', () => {
      if (cp.killed) 
        return resolve("skipped");

      return resolve(behaveOutput);
    });

  });
}

