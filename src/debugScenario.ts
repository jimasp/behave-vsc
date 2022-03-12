import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import config from "./configuration";
import { parseOutputAndUpdateTestResult } from './outputParser';
import { QueueItem } from './extension';

let debugStopClicked = false;
export const resetDebugStop = () => debugStopClicked = false;
export const debugStopped = () => debugStopClicked;


export async function debugScenario(run:vscode.TestRun, queueItem:QueueItem, escapedScenarioName: string, args: string[],
  cancellation: vscode.CancellationToken, friendlyCmd:string): Promise<void> {

  const scenarioSlug = escapedScenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const featureSlug = queueItem.scenario.featureName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outFile = path.join(`${config.debugOutputFilePath}`, `${featureSlug}.${scenarioSlug}.result`);

  // don't show to user in debug - just for extension debug/test
  console.log(friendlyCmd);

  // delete any existing file with the same name (e.g. prior run or duplicate slug)
  if (fs.existsSync(outFile)) {
    fs.unlinkSync(outFile); 
  }

  args.push("-o", outFile);

  const debugLaunchConfig = {
    name: "behave-vsc-debug",
    console: "internalConsole",
    type: "python",
    cwd: config.workspaceFolderPath,
    request: 'launch',
    module: "behave",
    args: args,
    env: config.userSettings.envVars
  };


  if(!await vscode.debug.startDebugging(config.workspaceFolder, debugLaunchConfig))
    return; 

  // debug stop - VERY hacky way to determine if debug stopped by user click
  // (onDidTerminateDebugSession doesn't provide reason for the stop)
  vscode.debug.registerDebugAdapterTrackerFactory('*', {
    createDebugAdapterTracker() {
      return {
        onDidSendMessage: m => {
          if(m.event === "exited" && m.body?.exitCode === 247) {  // magic number error code
            debugStopClicked = true;
          }
         }
      };
    }
  });    
  
  // test run stop 
  cancellation.onCancellationRequested(() => {
    config.logger.logInfo("-- TEST RUN CANCELLED --\n");
    return vscode.debug.stopDebugging();      
  });

  
  let onDidTerminateDebugSessionAlreadyFired = false;

  return await new Promise((resolve, reject) => {
      // debug stopped or completed    
    vscode.debug.onDidTerminateDebugSession(() => {

        if (onDidTerminateDebugSessionAlreadyFired) 
          return; 
        onDidTerminateDebugSessionAlreadyFired = true;

        if(debugStopClicked)
          return resolve();

        if (!fs.existsSync(outFile))
          return reject("Error: see behave output in debug console");
      
        const behaveOutput = fs.readFileSync(outFile, "utf8");
        parseOutputAndUpdateTestResult(run, queueItem, behaveOutput, true);

        resolve();
    });

  });

}
