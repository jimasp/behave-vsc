import { runBehaveInstance } from './behaveRun';
import { debugBehaveInstance } from './behaveDebug';
import { QueueItem } from '../extension';
import { projError } from '../common/helpers';
import { ProjRun } from './testRunHandler';
import {
  addTags, getFriendlyEnvVars, getPSCmdModifyIfWindows, getFeaturePathsRegEx,
  getPipedScenarioNamesRegex, projDirRelativePathToWorkDirRelativePath
} from './helpers';



// hard-code any settings we MUST have (i.e. override user behave.ini file only where absolutely necessary)
// NOTE: show-skipped is always required, otherwise skipped tests would not produce junit output and we would not be able to 
// update them in the test explorer tree (this is particularly important for tagged runs where we don't know what ran)
const OVERRIDE_ARGS = [
  "--show-skipped",
  "--junit",
  "--junit-directory"
];


export async function runOrDebugAllFeaturesInOneInstance(pr: ProjRun): Promise<void> {
  // runs all features in a single instance of behave

  const friendlyEnvVars = getFriendlyEnvVars(pr);
  const { ps1, ps2 } = getPSCmdModifyIfWindows();

  let friendlyArgs = [...OVERRIDE_ARGS, `"${pr.junitRunDirUri.fsPath}"`];
  const args = addTags(pr, friendlyArgs, false, false);
  friendlyArgs = addTags(pr, friendlyArgs, false, true);

  const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
    `${friendlyEnvVars}${ps2}"${pr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

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

    const featurePathsPattern = getFeaturePathsRegEx(pr, scenarioQueueItems);
    const friendlyEnvVars = getFriendlyEnvVars(pr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    let friendlyArgs = ["-i", `"${featurePathsPattern}"`, ...OVERRIDE_ARGS, `"${pr.junitRunDirUri.fsPath}"`];
    const args = addTags(pr, friendlyArgs, false, false);
    friendlyArgs = addTags(pr, friendlyArgs, false, true);

    const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${pr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

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

    const friendlyPipedScenarioNames = getPipedScenarioNamesRegex(selectedScenarioQueueItems, true);
    const pipedScenarioNames = getPipedScenarioNamesRegex(selectedScenarioQueueItems, false);
    const friendlyEnvVars = getFriendlyEnvVars(pr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    const featureFileProjectRelativePath = selectedScenarioQueueItems[0].scenario.featureFileProjectRelativePath;
    const featureFileWorkRelPath = projDirRelativePathToWorkDirRelativePath(pr, featureFileProjectRelativePath);

    let friendlyArgs = [
      "-i", `"${featureFileWorkRelPath}$"`,
      "-n", `"${friendlyPipedScenarioNames}"`,
      ...OVERRIDE_ARGS, `"${pr.junitRunDirUri.fsPath}"`,
    ];
    friendlyArgs = addTags(pr, friendlyArgs, true, true);

    let args = [
      "-i", `"${featureFileWorkRelPath}$"`,
      "-n", `"${pipedScenarioNames}"`,
      ...OVERRIDE_ARGS, `"${pr.junitRunDirUri.fsPath}"`,
    ];
    args = addTags(pr, args, true, false);

    const friendlyCmd = `${ps1}cd "${pr.projSettings.behaveWorkingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${pr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

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

