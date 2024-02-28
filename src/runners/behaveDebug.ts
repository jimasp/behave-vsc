import * as vscode from 'vscode';
import { services } from "../common/services";
import { xRayLog } from '../common/logger';
import { ProjRun } from './testRunHandler';



export async function debugBehaveInstance(pr: ProjRun, args: string[], friendlyCmd: string): Promise<void> {

  const runCancelHandler = pr.run.token.onCancellationRequested(async () => await vscode.debug.stopDebugging());

  try {
    xRayLog(friendlyCmd, pr.projSettings.uri); // log debug friendlyCmd in diagnostics log only

    // --outfile = remove stdout noise from debug console
    args.push("--no-summary", "--outfile",
      vscode.Uri.joinPath(services.config.extensionTempFilesUri, `${(pr.run.name ?? "")}-${pr.projSettings.name}-debug.log`).fsPath);

    const env = { ...process.env, ...pr.env };

    let debugLaunchConfig: vscode.DebugConfiguration;

    const launchConfig = {
      name: `Behave VSC`,
      console: "internalConsole",
      type: "python",
      cwd: pr.projSettings.behaveWorkingDirUri.fsPath,
      request: 'launch',
      env: env,
      justMyCode: pr.projSettings.justMyCode
    };

    if (pr.customRunner) {
      args.unshift("behave");
      debugLaunchConfig = { ...launchConfig, program: pr.customRunner.script, args: args };
    }
    else {
      debugLaunchConfig = { ...launchConfig, module: "behave", args: args };
    }

    const projFolder = vscode.workspace.getWorkspaceFolder(pr.projSettings.uri);

    if (!await vscode.debug.startDebugging(projFolder, debugLaunchConfig)) {
      xRayLog("unable to start debug session, was debug stop button clicked?", pr.projSettings.uri);
      return;
    }

    await new Promise(r => vscode.debug.onDidTerminateDebugSession(async () => r("")));

  }
  finally {
    runCancelHandler.dispose();
  }
}
