import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { TextDecoder } from 'util';
import config from "./configuration";
import { parseOutputAndUpdateTestResult } from './outputParser';
import { QueueItem } from './extension';


export async function debugScenario(run:vscode.TestRun, queueItem:QueueItem, escapedScenarioName: string, 
  args: string[], cancellation: vscode.CancellationToken): Promise<void> {
        
  const scenarioSlug = escapedScenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const featureSlug = queueItem.scenario.featureName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outFile = path.join(`${config.debugOutputFilePath}`, `${featureSlug}.${scenarioSlug}.result`);

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
  };

  await vscode.debug.startDebugging(config.workspaceFolder, debugLaunchConfig);

  cancellation.onCancellationRequested(() => {
    config.logger.logInfo("-- TEST RUN CANCELLED --\n");
    // (note - vscode will have ended the run, so we cannot update the test status)
    return vscode.debug.stopDebugging();      
  });  
  
  let onDidTerminateDebugSessionFired = false;

  return await new Promise((resolve, reject) => {

    vscode.debug.onDidTerminateDebugSession(async() => {
      // event seems to get raised multiple times?
      if (onDidTerminateDebugSessionFired) 
        return; 
      onDidTerminateDebugSessionFired = true;

      if (!fs.existsSync(outFile))
        reject("error: see debug console");

      const outFileUri = vscode.Uri.file(outFile);        
      const raw = await vscode.workspace.fs.readFile(outFileUri);
      const behaveOutput = new TextDecoder('utf-8').decode(raw);

      parseOutputAndUpdateTestResult(run, queueItem, behaveOutput);
      resolve();
    });

  });

}
