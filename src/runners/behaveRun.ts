import { ChildProcess, spawn, exec, SpawnOptions } from 'child_process';
import { services } from "../common/services";
import { cleanBehaveText } from '../common/helpers';
import { xRayLog } from '../common/logger';
import { ProjRun } from './testRunHandler';



export async function runBehaveInstance(pr: ProjRun, args: string[], friendlyCmd: string): Promise<void> {

  let cp: ChildProcess;
  const cancellationHandler = pr.run.token.onCancellationRequested(() => cp?.kill());
  const projUri = pr.projSettings.uri;
  const local_args = [...args];

  try {

    if (pr.customRunner)
      local_args.unshift(pr.customRunner.scriptFile, "behave");
    else
      local_args.unshift("-m", "behave");

    xRayLog(`${pr.pythonExec} ${local_args.join(" ")}`, projUri);
    const env = { ...process.env, ...pr.env };
    const options: SpawnOptions = { cwd: pr.projSettings.behaveWorkingDirUri.fsPath, env: env };

    // on integration test runs ONLY, we sometimes use cp.exec 
    // instead of cp.spawn, so that we can test the generated friendlyCmd executes correctly
    if (services.config.isIntegrationTestRun && pr.projSettings.integrationTestRunUseCpExec) {
      xRayLog("--- integration test running in exec mode ---")
      cp = exec(friendlyCmd);
    }
    else {
      cp = spawn(pr.pythonExec, local_args, options);
    }

    if (!cp.pid) {
      throw new Error(`unable to launch python or behave, command: ${pr.pythonExec} ${local_args.join(" ")}\n` +
        `working directory:${projUri.fsPath}\nenv var overrides: ${JSON.stringify(pr.env)}`);
    }

    // if parallel mode, use a buffer so logs gets written out in a human-readable order
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

    if (pr.run.token.isCancellationRequested)
      services.logger.logInfo(`\n-- TEST RUN ${pr.run.name} CANCELLED --`, projUri, pr.run);

  }
  finally {
    cancellationHandler.dispose();
  }

}


