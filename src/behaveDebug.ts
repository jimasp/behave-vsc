import * as vscode from 'vscode';
import { config, EXTENSION_NAME } from "./Configuration";
import { WorkspaceSettings } from "./settings";
import { parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { diagLog } from './Logger';


export async function debugScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  args: string[], cancelToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri: vscode.Uri): Promise<void> {

  // handle test run stop 
  const cancellationHandler = cancelToken.onCancellationRequested(async () => {
    await vscode.debug.stopDebugging();
  });


  try {

    diagLog(friendlyCmd); // log debug cmd for extension devs only

    // remove stdout noise when debugging
    args.push("--no-summary", "--outfile", config.extTempFilesUri.fsPath + "debug.log");

    const debugLaunchConfig = {
      name: `${EXTENSION_NAME}-debug`,
      console: "internalConsole",
      type: "python",
      cwd: wkspSettings.uri.fsPath,
      request: 'launch',
      module: "behave",
      args: args,
      env: wkspSettings.envVarList,
      justMyCode: wkspSettings.justMyCode
    };


    const wkspFolder = vscode.workspace.getWorkspaceFolder(wkspSettings.uri);

    if (!await vscode.debug.startDebugging(wkspFolder, debugLaunchConfig)) {
      diagLog("unable to start debug session, was debug stop button clicked?")
      return;
    }

    return await new Promise((resolve, reject) => {
      // debug stopped or completed    
      const terminateEvent = vscode.debug.onDidTerminateDebugSession(async () => {
        try {
          await parseAndUpdateTestResults(junitFileUri, run, queueItem, wkspSettings.workspaceRelativeFeaturesPath, cancelToken);
          resolve();
        }
        catch (e: unknown) {
          return reject(e);
        }
        finally {
          terminateEvent.dispose();
        }

      });
    });

  }
  finally {
    cancellationHandler.dispose();
  }
}
