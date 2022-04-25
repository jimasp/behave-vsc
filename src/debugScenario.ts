import * as vscode from 'vscode';
import config, { WorkspaceSettings } from "./configuration";
import { parseOutputAndUpdateTestResults } from './outputParser';
import { QueueItem } from './extension';
const vwfs = vscode.workspace.fs;


export async function debugScenario(wkspSettings: WorkspaceSettings, run: vscode.TestRun, queueItem: QueueItem, escapedScenarioName: string,
  args: string[], cancellation: vscode.CancellationToken, friendlyCmd: string): Promise<void> {

  const scenarioSlug = escapedScenarioName.replace(/[^a-z0-9]/gi, '_').slice(1, -1).toLowerCase();
  const featureSlug = queueItem.scenario.featureName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const outFile = vscode.Uri.joinPath(config.tempFilesUri, `${run.name}__${featureSlug}__${scenarioSlug}.result`);
  console.log(friendlyCmd); // log debug cmd for extension devs only

  args.push("--outfile", outFile.path);

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

        try {
          const stat = await vwfs.stat(outFile);
          if (stat.size === 0)
            throw new Error("behave output file exists, but is empty");
        }
        catch (e: unknown) {
          // if there is no behave output file, then either debug stop was clicked, or something went wrong with behave.
          // in the second case, the error should be logged in debug console and won't be parseable          
          if ((e as vscode.FileSystemError).code === "FileNotFound") {
            return resolve();
          }
          else {
            return reject(e);
          }
        }

        const data = await vwfs.readFile(outFile);
        const behaveOutput = Buffer.from(data).toString('utf8');

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
