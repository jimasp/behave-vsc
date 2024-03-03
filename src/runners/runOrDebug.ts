import { runBehaveInstance } from './behaveRun';
import { debugBehaveInstance } from './behaveDebug';
import { QueueItem } from '../extension';
import { projError } from '../common/helpers';
import { ProjRun } from './testRunHandler';
import {
  getFriendlyEnvVars, getPSCmdModifyIfWindows, getOptimisedFeaturePathsRegEx,
  getPipedScenarioNamesRegex, projDirRelativePathToWorkDirRelativePath
} from './helpers';



// hard-code any settings we MUST have (i.e. override user behave.ini file only where absolutely necessary)
// NOTE: show-skipped is always required, otherwise skipped tests would not produce junit output and we would not be able to 
// update them in the test explorer tree (this is particularly important for tagged runs where we don't know what ran)
const CONFIG_OVERRIDE_ARGS = [
  "--show-skipped",
  "--junit",
  "--junit-directory"
];


export async function runOrDebugAllFeaturesInOneInstance(pr: ProjRun): Promise<void> {
  // runs all features in a single instance of behave

  const friendlyEnvVars = getFriendlyEnvVars(pr);
  const { ps1, ps2 } = getPSCmdModifyIfWindows();
  const friendlyArgs = [
    ...pr.customRunner?.args ?? [],
    ...splitTagExpression(pr.tagExpression),
    ...CONFIG_OVERRIDE_ARGS,
    `"${pr.junitRunDirUri.fsPath}"`,
  ];
  const args = unquoteArgs(friendlyArgs);

  const scriptOrModule = pr.customRunner ? pr.customRunner.script : "-m";
  const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
    `${friendlyEnvVars}${ps2}"${pr.pythonExec}" ${scriptOrModule} behave ` +
    `${friendlyArgs.filter(arg => arg !== '').join(" ")}`;

  if (pr.debug) {
    await debugBehaveInstance(pr, args, friendlyCmd);
    return;
  }

  await runBehaveInstance(pr, args, friendlyCmd);
}


export async function runOrDebugFeatures(pr: ProjRun, scenarioQueueItems: QueueItem[]): Promise<void> {

  // runs selected features in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (pr.projSettings.runParallel && pr.debug)
      throw new Error("running async debug is not supported");

    const featurePathsPattern = getOptimisedFeaturePathsRegEx(pr, scenarioQueueItems);
    const friendlyEnvVars = getFriendlyEnvVars(pr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    const friendlyArgs = [
      ...pr.customRunner?.args ?? [],
      ...splitTagExpression(pr.tagExpression),
      "-i", `"${featurePathsPattern}"`,
      ...CONFIG_OVERRIDE_ARGS,
      `"${pr.junitRunDirUri.fsPath}"`,
    ];
    const args = unquoteArgs(friendlyArgs);

    const scriptOrModule = pr.customRunner ? pr.customRunner.script : "-m";
    const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${pr.pythonExec}" ${scriptOrModule} behave ` +
      `${friendlyArgs.filter(arg => arg !== '').join(" ")}`;

    if (pr.debug) {
      await debugBehaveInstance(pr, args, friendlyCmd);
      return;
    }

    await runBehaveInstance(pr, args, friendlyCmd);
  }
  catch (e: unknown) {
    pr.run.end();
    // unawaited (if runParallel) async func, must log the error 
    throw new projError(e, pr.projSettings.uri, pr.run);
  }

}


export async function runOrDebugFeatureWithSelectedScenarios(pr: ProjRun, selectedScenarioQueueItems: QueueItem[]): Promise<void> {

  // runs selected scenarios in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (pr.projSettings.runParallel && pr.debug)
      throw new Error("running parallel debug is not supported");

    const friendlyArgsPipedScenarioNames = getPipedScenarioNamesRegex(selectedScenarioQueueItems, true);
    const argsPipedScenarioNames = getPipedScenarioNamesRegex(selectedScenarioQueueItems, false);
    const friendlyEnvVars = getFriendlyEnvVars(pr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    const featureFileProjectRelativePath = selectedScenarioQueueItems[0].scenario.featureFileProjectRelativePath;
    const featureFileWorkRelPath = projDirRelativePathToWorkDirRelativePath(pr.projSettings, featureFileProjectRelativePath);


    const friendlyArgs = [
      ...pr.customRunner?.args ?? [],
      ...splitTagExpression(pr.tagExpression),
      "-i", `"${featureFileWorkRelPath}$"`,
      "-n", `"${friendlyArgsPipedScenarioNames}"`,
      ...CONFIG_OVERRIDE_ARGS,
      `"${pr.junitRunDirUri.fsPath}"`,
    ];
    const args = unquoteArgs(friendlyArgs);
    args.splice(args.findIndex(item => item === `-n`) + 1, 1, argsPipedScenarioNames);

    const scriptOrModule = pr.customRunner ? pr.customRunner.script : "-m";
    const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${pr.pythonExec}" ${scriptOrModule} behave ` +
      `${friendlyArgs.filter(arg => arg !== '').join(" ")}`;

    if (pr.debug) {
      await debugBehaveInstance(pr, args, friendlyCmd);
      return;
    }

    await runBehaveInstance(pr, args, friendlyCmd);
  }
  catch (e: unknown) {
    pr.run.end();
    // unawaited (if runParallel) async func, must log the error 
    throw new projError(e, pr.projSettings.uri, pr.run);
  }

}


function unquoteArgs(args: string[]) {
  args = args.map(x => x.replace(/^"(.*)"$/, '$1'));
  args = args.filter(x => x !== '');
  return args;
}


function splitTagExpression(tagExpression: string): string[] {
  return tagExpression.split(" ");
}
