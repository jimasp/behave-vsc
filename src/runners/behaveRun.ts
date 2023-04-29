import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import { diagLog } from '../common/logger';
import { WkspRun } from './testRunHandler';



export async function runBehaveInstance(wr: WkspRun, parallelMode: boolean,
  args: string[], friendlyCmd: string): Promise<void> {

  let cp: ChildProcess;
  const cancellationHandler = wr.run.token.onCancellationRequested(() => cp?.kill());
  const wkspUri = wr.wkspSettings.uri;

  function output(output: string) {
    wr.run.appendOutput(output.replaceAll("\n", "\r\n"));
  }

  try {
    const local_args = [...args];
    local_args.unshift("-m", "behave");
    diagLog(`${wr.pythonExec} ${local_args.join(" ")}`, wkspUri);
    const env = { ...process.env, ...wr.wkspSettings.envVarOverrides };
    const options: SpawnOptions = { cwd: wkspUri.fsPath, env: env };
    cp = spawn(wr.pythonExec, local_args, options);

    if (!cp.pid) {
      throw `unable to launch python or behave, command: ${wr.pythonExec} ${local_args.join(" ")}\n` +
      `working directory:${wkspUri.fsPath}\nenv var overrides: ${JSON.stringify(wr.wkspSettings.envVarOverrides)}`;
    }

    friendlyCmd = friendlyCmd.replaceAll("\n", "\r\n");

    if (!parallelMode)
      output(`\n${friendlyCmd}\n`);

    await new Promise((resolve) => cp.on('close', () => resolve("")));

    if (wr.run.token.isCancellationRequested)
      output(`\n-- TEST RUN ${wr.run.name} CANCELLED --`);

  }
  finally {
    cancellationHandler.dispose();
  }

}


