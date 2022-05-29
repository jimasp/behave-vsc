import * as vscode from 'vscode';
import { config, EXTENSION_NAME } from "./Configuration";
import { WorkspaceSettings } from "./settings";
import { parseAndUpdateTestResults } from './junitParser';
import { QueueItem } from './extension';
import { diagLog } from './Logger';
import { cancelTestRun } from './testRunHandler';
import { isBehaveExecutionError } from './common';
import { performance } from 'perf_hooks';


let behaveExecutionError = false;

// onDidTerminateDebugSession doesn't provide a reason for the termination,
// so we need to check the reason from the debug adapter protocol
// secondary purpose is to set behaveExecutionError flag so we can mark test as failed
export function getDebugAdapterTrackerFactory() {
  return vscode.debug.registerDebugAdapterTrackerFactory('*', {

    // this function will get called for each debug session
    createDebugAdapterTracker() {
      let threadExit = false;

      return {
        onDidSendMessage: (m) => {
          try {
            // https://github.com/microsoft/vscode-debugadapter-node/blob/main/debugProtocol.json

            diagLog(JSON.stringify(m));

            const stderr = m.body?.category === "stderr";
            if (stderr && isBehaveExecutionError(m.body.output)) {
              behaveExecutionError = true;
              cancelTestRun("onDidSendMessage (behave execution error)");
              return;
            }

            if (m.body?.reason === "exited" && m.body?.threadId) {
              // mark threadExit for subsequent calls
              threadExit = true;
              return;
            }

            if (m.event === "exited") {
              if (!threadExit) {
                // exit, but not a thread exit, so we need to stop the run
                // (most likely debug was stopped by user)
                cancelTestRun("onDidSendMessage (debug stop)");
              }
            }
          }
          catch (e: unknown) {
            // entry point function (handler) - show error
            config.logger.showError(e, undefined);
          }
        },
      };
    }
  })
}


export async function debugScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem,
  args: string[], cancelToken: vscode.CancellationToken, friendlyCmd: string, junitDirUri: vscode.Uri, junitFileUri: vscode.Uri): Promise<void> {

  // handle test run stop 
  const cancellationHandler = cancelToken.onCancellationRequested(async () => {
    await vscode.debug.stopDebugging();
  });

  behaveExecutionError = false;

  try {
    diagLog(friendlyCmd, wkspSettings.uri); // log debug cmd for extension devs only

    // remove stdout noise when debugging
    args.push("--no-summary", "--outfile", vscode.Uri.joinPath(config.extensionTempFilesUri, "debug.log").fsPath);

    const env = { ...process.env, ...wkspSettings.envVarList };

    const debugLaunchConfig = {
      name: `${EXTENSION_NAME}-debug`,
      console: "internalConsole",
      type: "python",
      cwd: wkspSettings.uri.fsPath,
      request: 'launch',
      module: "behave",
      args: args,
      env: env,
      justMyCode: wkspSettings.justMyCode
    };

    const wkspFolder = vscode.workspace.getWorkspaceFolder(wkspSettings.uri);
    const start = performance.now();

    if (!await vscode.debug.startDebugging(wkspFolder, debugLaunchConfig)) {
      diagLog("unable to start debug session, was debug stop button clicked?", wkspSettings.uri);
      return;
    }


    return await new Promise((resolve, reject) => {
      // debug stopped or completed    
      const terminateEvent = vscode.debug.onDidTerminateDebugSession(async () => {
        try {
          const debugDuration = performance.now() - start;
          await parseAndUpdateTestResults(true, behaveExecutionError, wkspSettings, junitFileUri, run, queueItem, cancelToken, debugDuration);
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
