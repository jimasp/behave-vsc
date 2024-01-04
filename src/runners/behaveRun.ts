import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { services } from "../services";
import { cleanBehaveText } from '../common/helpers';
import { diagLog } from '../common/logger';
import { ProjRun } from './testRunHandler';



export async function runBehaveInstance(wr: ProjRun, parallelMode: boolean, args: string[], friendlyCmd: string): Promise<void> {

  let cp: ChildProcess;
  const cancellationHandler = wr.run.token.onCancellationRequested(() => cp?.kill());
  const projUri = wr.projSettings.uri;

  try {
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    diagLog(`${wr.pythonExec} ${local_args.join(" ")}`, projUri);
    const env = { ...process.env, ...wr.env };
    const options: SpawnOptions = { cwd: projUri.fsPath, env: env };
    cp = spawn(wr.pythonExec, local_args, options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${wr.pythonExec} ${local_args.join(" ")}\n` +
      `working directory:${projUri.fsPath}\nenv var overrides: ${JSON.stringify(wr.env)}`;
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
        services.logger.logInfoNoLF(str, projUri);
    }

    cp.stderr?.on('data', chunk => log(chunk.toString()));
    cp.stdout?.on('data', chunk => log(chunk.toString()));

    if (!parallelMode)
      services.logger.logInfo(`\n${friendlyCmd}\n`, projUri);

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (asyncBuff.length > 0) {
      services.logger.logInfo(`\n---\n${friendlyCmd}\n`, projUri);
      services.logger.logInfo(asyncBuff.join("").trim(), projUri);
      services.logger.logInfo("---", projUri);
    }

    if (wr.run.token.isCancellationRequested)
      services.logger.logInfo(`\n-- TEST RUN ${wr.run.name} CANCELLED --`, projUri, wr.run);

  }
  finally {
    cancellationHandler.dispose();
  }

}


