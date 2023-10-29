import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { config } from "../configuration";
import { cleanBehaveText } from '../common';
import { diagLog } from '../logger';
import { WkspRun } from './testRunHandler';



export async function runBehaveInstance(wr: WkspRun, parallelMode: boolean, args: string[], friendlyCmd: string): Promise<void> {

  let cp: ChildProcess;
  const cancellationHandler = wr.run.token.onCancellationRequested(() => cp?.kill());
  const wkspUri = wr.wkspSettings.uri;

  try {
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    diagLog(`${wr.pythonExec} ${local_args.join(" ")}`, wkspUri);
    const env = { ...process.env, ...wr.envVars };
    const options: SpawnOptions = { cwd: wkspUri.fsPath, env: env };
    cp = spawn(wr.pythonExec, local_args, options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${wr.pythonExec} ${local_args.join(" ")}\n` +
      `working directory:${wkspUri.fsPath}\nenv var overrides: ${JSON.stringify(wr.envVars)}`;
    }

    // if parallel mode, use a buffer so logs gets written out in a human-readable order
    const asyncBuff: string[] = [];
    const log = (str: string) => {
      if (!str)
        return;
      str = cleanBehaveText(str);
      if (parallelMode)
        asyncBuff.push(str);
      else
        config.logger.logInfoNoLF(str, wkspUri);
    }

    cp.stderr?.on('data', chunk => log(chunk.toString()));
    cp.stdout?.on('data', chunk => log(chunk.toString()));

    if (!parallelMode)
      config.logger.logInfo(`\n${friendlyCmd}\n`, wkspUri);

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (asyncBuff.length > 0) {
      config.logger.logInfo(`\n---\n${friendlyCmd}\n`, wkspUri);
      config.logger.logInfo(asyncBuff.join("").trim(), wkspUri);
      config.logger.logInfo("---", wkspUri);
    }

    if (wr.run.token.isCancellationRequested)
      config.logger.logInfo(`\n-- TEST RUN ${wr.run.name} CANCELLED --`, wkspUri, wr.run);

  }
  finally {
    cancellationHandler.dispose();
  }

}


