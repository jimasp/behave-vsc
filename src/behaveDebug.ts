import * as vscode from 'vscode';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";
import { junitFileExists, parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';


export async function debugScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  args: string[], cancellation: vscode.CancellationToken, friendlyCmd: string, junitUri: vscode.Uri): Promise<void> {

  console.log(friendlyCmd); // log debug cmd for extension devs only

  // remove stdout noise when debugging
  args.push("--no-summary", "--outfile", config.extTempFilesUri.fsPath + "debug.log");

  const debugLaunchConfig = {
    name: "behave-vsc-debug",
    console: "internalConsole",
    type: "python",
    cwd: wkspSettings.uri.path,
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


  const wkspFolder = vscode.workspace.getWorkspaceFolder(wkspSettings.uri);

  if (!await vscode.debug.startDebugging(wkspFolder, debugLaunchConfig))
    throw new Error("unable to start debug session");


  return await new Promise((resolve, reject) => {
    // debug stopped or completed    
    const terminateEvent = vscode.debug.onDidTerminateDebugSession(async () => {

      try {

        if (!await junitFileExists(queueItem, wkspSettings.featuresPath, junitUri)) {
          // if there is no junit output file, then either debug stop was clicked, or something went wrong with behave.
          // in the second case, the error should be logged in debug console and won't be parseable          
          return resolve();
        }

        await parseAndUpdateTestResults(run, queueItem, wkspSettings.featuresPath, junitUri);
        resolve();
      }
      catch (e: unknown) {
        return reject(e); // (will get logged in parent try/catch)
      }
      finally {
        terminateEvent.dispose();
      }

    });
  });

}
