import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import config, { WorkspaceSettings } from "./configuration";
import { parseOutputAndUpdateTestResults } from './outputParser';
import { QueueItem } from './extension';


export async function debugScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem, escapedScenarioName: string,
  args: string[], cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {

  const scenarioSlug = escapedScenarioName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const featureSlug = queueItem.scenario.featureName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outFile = path.join(`${config.debugOutputFilePath}`, `${featureSlug}.${scenarioSlug}.result`);
  console.log(friendlyCmd); // log for extension devs only

  // delete any existing file with the same name (e.g. prior run or duplicate slug)
  if (fs.existsSync(outFile)) {
    fs.unlinkSync(outFile);
  }

  args.push("-o", outFile);

  const debugLaunchConfig = {
    name: "behave-vsc-debug",
    console: "internalConsole",
    type: "python",
    cwd: wkspSettings.fullWorkingDirectoryPath,
    request: 'launch',
    module: "behave",
    args: args,
    env: wkspSettings.envVarList,
    justMyCode: wkspSettings.justMyCode
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


  if (!await vscode.debug.startDebugging(wkspSettings.workspaceFolder, debugLaunchConfig))
    return;


  return await new Promise((resolve, reject) => {
    // debug stopped or completed    
    const terminateEvent = vscode.debug.onDidTerminateDebugSession(() => {

      try {

        let behaveOutput = "";
        if (fs.existsSync(outFile))
          behaveOutput = fs.readFileSync(outFile, "utf8");

        // if there is no behave output, then either debug stop was clicked, or something went wrong with behave.
        // in the second case, the error should be logged in debug console and won't be parseable
        if (behaveOutput.trim() !== "")
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
