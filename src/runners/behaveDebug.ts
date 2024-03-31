import * as vscode from 'vscode';
import { services } from "../common/services";
import { xRayLog } from '../common/logger';
import { ProjRun } from './testRunHandler';



export async function debugBehaveInstance(pr: ProjRun, args: string[], friendlyCmd: string): Promise<void> {

  const runCancelHandler = pr.projTestRun.token.onCancellationRequested(async () => await vscode.debug.stopDebugging());

  try {
    xRayLog(friendlyCmd, pr.projSettings.uri); // log debug friendlyCmd in diagnostics log only

    // --outfile = remove stdout noise from debug console
    args.push("--no-summary", "--outfile",
      vscode.Uri.joinPath(services.config.extensionTempDirUri, "debug", `${(pr.projTestRun.name ?? "")}.log`).fsPath);

    const env = { ...process.env, ...pr.env };

    let debugLaunchConfig: vscode.DebugConfiguration;

    const launchConfig = {
      name: `Behave VSC`,
      console: "internalConsole",
      type: "debugpy",
      cwd: pr.projSettings.behaveWorkingDirUri.fsPath,
      request: 'launch',
      env: env,
      justMyCode: pr.projSettings.justMyCode
    };

    if (pr.customRunner) {
      args.unshift("behave");
      debugLaunchConfig = { ...launchConfig, program: pr.customRunner.scriptFile, args: args };
    }
    else {
      debugLaunchConfig = { ...launchConfig, module: "behave", args: args };
    }

    xRayLog(`Starting debug session, launch config: ${JSON.stringify(debugLaunchConfig, null, 2)}`);

    const projFolder = vscode.workspace.getWorkspaceFolder(pr.projSettings.uri);

    if (!await vscode.debug.startDebugging(projFolder, debugLaunchConfig)) {
      xRayLog("unable to start debug session, was debug stop button clicked? or did a custom script fail to run?", pr.projSettings.uri);
      return;
    }

    await new Promise(resolve => vscode.debug.onDidTerminateDebugSession(async () => resolve("")));

  }
  finally {
    runCancelHandler.dispose();
  }
}
