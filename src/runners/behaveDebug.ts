import * as vscode from 'vscode';
import { config } from "../configuration";
import { diagLog } from '../logger';
import { ProjRun } from './testRunHandler';



export async function debugBehaveInstance(wr: ProjRun, args: string[], friendlyCmd: string): Promise<void> {

  const runCancelHandler = wr.run.token.onCancellationRequested(async () => await vscode.debug.stopDebugging());

  try {
    diagLog(friendlyCmd, wr.projSettings.uri); // log debug friendlyCmd in diagnostics log only

    // --outfile = remove stdout noise from debug console
    args.push("--no-summary", "--outfile",
      vscode.Uri.joinPath(config.extensionTempFilesUri, `${(wr.run.name ?? "")}-${wr.projSettings.name}-debug.log`).fsPath);

    const env = { ...process.env, ...wr.envVarOverrides };

    const debugLaunchConfig = {
      name: `behave-vsc-debug`,
      console: "internalConsole",
      type: "python",
      cwd: wr.projSettings.uri.fsPath,
      request: 'launch',
      module: "behave",
      args: args,
      env: env,
      justMyCode: wr.projSettings.justMyCode
    };

    const projFolder = vscode.workspace.getWorkspaceFolder(wr.projSettings.uri);

    if (!await vscode.debug.startDebugging(projFolder, debugLaunchConfig)) {
      diagLog("unable to start debug session, was debug stop button clicked?", wr.projSettings.uri);
      return;
    }

    await new Promise(r => vscode.debug.onDidTerminateDebugSession(async () => r("")));

  }
  finally {
    runCancelHandler.dispose();
  }
}
