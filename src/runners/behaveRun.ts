import { ChildProcess, spawn, exec, ExecOptions } from 'child_process';
import { services } from "../common/services";
import { cleanBehaveText, PWRSHELL_CMD_INTRO } from '../common/helpers';
import { xRayLog } from '../common/logger';
import { ProjRun } from './testRunHandler';
import { Shell } from "../config/settings";



export async function runBehaveInstance(pr: ProjRun, args: string[], friendlyCmd: string): Promise<void> {

  let cp: ChildProcess;
  const cancellationHandler = pr.projTestRun.token.onCancellationRequested(() => cp?.kill());
  const projUri = pr.projSettings.uri;

  try {

    if (pr.customRunner)
      args.unshift(pr.customRunner.scriptFile, "behave");
    else
      args.unshift("-m", "behave");

    xRayLog(`Starting behave with cmd: "${pr.pythonExec}" ${args.join(" ")}` +
      `\n\nworking directory: "${projUri.fsPath}"\nenv var overrides: ${JSON.stringify(pr.env)}`, projUri);

    const env = { ...process.env, ...pr.env };
    const options: ExecOptions = { shell: undefined, cwd: pr.projSettings.behaveWorkingDirUri.fsPath, env: env };

    // on integration test runs ONLY, we sometimes use cp.exec instead of cp.spawn, 
    // so that we can test the generated friendlyCmd will execute correctly when run manually by the user
    if (services.config.isIntegrationTestRun && pr.projSettings.integrationTestRunUseCpExec) {
      xRayLog("--- integration test running in exec mode ---");
      if (services.config.instanceSettings.shell === Shell.powershell) {
        const cmdWithoutIntro = friendlyCmd.replace(PWRSHELL_CMD_INTRO, "");
        options.shell = 'powershell.exe';
        cp = exec(cmdWithoutIntro, options);
      }
      else {
        cp = exec(friendlyCmd, options);
      }
    }
    else {
      // we prefer spawn for normal runs as it's more efficient than exec (and also streams its output as it goes)
      args = args.map(a => a.replace(/\\"/g, '"').replace(/\\'/g, "'"));
      cp = spawn(pr.pythonExec, args, options);
    }

    if (!cp.pid) {
      services.logger.logError(`Unable to launch python or behave using commands:\n${friendlyCmd}`, projUri);
      return;
    }

    // if parallel mode, we use a buffer so logs gets written out in a human-readable order
    const asyncBuff: string[] = [];
    const log = (str: string) => {
      if (!str)
        return;
      str = cleanBehaveText(str);
      if (pr.projSettings.runParallel)
        asyncBuff.push(str);
      else
        services.logger.logInfoNoLF(str, projUri);
    }

    cp.stderr?.on('data', chunk => log(chunk.toString()));
    cp.stdout?.on('data', chunk => log(chunk.toString()));

    if (!pr.projSettings.runParallel)
      services.logger.logInfo(`\n${friendlyCmd}\n`, projUri);

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (asyncBuff.length > 0) {
      services.logger.logInfo(`\n---\n${friendlyCmd}\n`, projUri);
      services.logger.logInfo(asyncBuff.join("").trim(), projUri);
      services.logger.logInfo("---", projUri);
    }

    if (pr.projTestRun.token.isCancellationRequested)
      services.logger.logInfo(`\n-- TEST RUN ${pr.projTestRun.name} CANCELLED --`, projUri, pr.projTestRun);

  }
  finally {
    cancellationHandler.dispose();
  }

}


