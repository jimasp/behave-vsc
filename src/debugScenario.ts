import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import config from "./configuration";
import { parseOutputAndUpdateTestResults } from './outputParser';
import { QueueItem } from './extension';

let debugStopClicked = false;
export const resetDebugStop = () => debugStopClicked = false;
export const debugStopped = () => debugStopClicked;



export async function debugScenario(context: vscode.ExtensionContext, run: vscode.TestRun, queueItem: QueueItem, escapedScenarioName: string,
  args: string[], cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {

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
    env: config.userSettings.envVarList
  };


  // handle test run stop 
  const cancellationEvent = cancellation.onCancellationRequested(() => {
    try {
      config.logger.logInfo("-- TEST RUN CANCELLED --\n");
      vscode.debug.stopDebugging();
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
    finally {
      cancellationEvent.dispose();
    }
  });

  // handle debug stop click - hacky way to determine if debug stopped by user click
  // (onDidTerminateDebugSession doesn't provide reason for the stop)
  const debugEvent = vscode.debug.onDidReceiveDebugSessionCustomEvent((m) => {
    try {
      // 247 = magic number exit code (probably specific to ms python debugger)
      if (m.event === "exited" && m.body?.exitCode === 247) {
        debugStopClicked = true;
        console.log("debug stop clicked");
      }
    }
    catch (e: unknown) {
      config.logger.logError(e);
    }
    finally {
      debugEvent.dispose();
    }
  });



  if (!await vscode.debug.startDebugging(config.workspaceFolder, debugLaunchConfig))
    return;


  return await new Promise((resolve, reject) => {
    // debug stopped or completed    
    const terminateEvent = vscode.debug.onDidTerminateDebugSession(() => {

      try {
        console.log("debug stopped");

        // user clicked stop, so there will be no output, just return
        if (debugStopClicked)
          return resolve();

        // user didn't click stop, so if no output file, something went wrong with behave
        if (!fs.existsSync(outFile))
          return reject("Error: see behave output in debug console");

        const behaveOutput = fs.readFileSync(outFile, "utf8");
        parseOutputAndUpdateTestResults(run, [queueItem], behaveOutput, true);

        resolve();
      }
      catch (e: unknown) {
        // (will get logged in parent try/catch)
        return reject(e);
      }
      finally {
        terminateEvent.dispose();
      }

    });
  });

}
