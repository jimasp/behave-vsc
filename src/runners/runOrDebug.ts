import * as vscode from 'vscode';
import * as os from 'os';
import { runBehaveInstance } from './behaveRun';
import { debugBehaveInstance } from './behaveDebug';
import { QueueItem } from '../extension';
import { projError } from '../common/helpers';
import { ProjRun } from './testRunHandler';



// hard-code any settings we MUST have (i.e. override user behave.ini file only where absolutely necessary)
// NOTE: show-skipped is always required, otherwise skipped tests would not produce junit output and we would not be able to 
// update them in the test explorer tree (this is particularly important for tagged runs where we don't know what ran)
const OVERRIDE_ARGS = [
  "--show-skipped",
  "--junit",
  "--junit-directory"
];


export async function runOrDebugAllFeaturesInOneInstance(wr: ProjRun): Promise<void> {
  // runs all features in a single instance of behave

  const friendlyEnvVars = getFriendlyEnvVars(wr);
  const { ps1, ps2 } = getPSCmdModifyIfWindows();

  const friendlyArgs = [...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`];
  const args = addTagsAndGetArgs(wr, friendlyArgs);

  const friendlyCmd = `${ps1}cd "${wr.projSettings.workingDirUri.fsPath}"\n` +
    `${friendlyEnvVars}${ps2}"${wr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

  if (wr.debug) {
    await debugBehaveInstance(wr, args, friendlyCmd);
    return;
  }

  await runBehaveInstance(wr, false, args, friendlyCmd);
}


export async function runOrDebugFeatures(wr: ProjRun, parallelMode: boolean, scenarioQueueItems: QueueItem[]): Promise<void> {

  // runs selected features in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (parallelMode && wr.debug)
      throw new Error("running async debug is not supported");

    const pipedPathPatterns = getPipedFeaturePathsPattern(wr, parallelMode, scenarioQueueItems);
    const friendlyEnvVars = getFriendlyEnvVars(wr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();

    const friendlyArgs = ["-i", `"${pipedPathPatterns}"`, ...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`];
    const args = addTagsAndGetArgs(wr, friendlyArgs);

    const friendlyCmd = `${ps1}cd "${wr.projSettings.workingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${wr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

    if (wr.debug) {
      await debugBehaveInstance(wr, args, friendlyCmd);
      return;
    }

    await runBehaveInstance(wr, parallelMode, args, friendlyCmd);
  }
  catch (e: unknown) {
    wr.run.end();
    // unawaited (if runParallel) async func, must log the error 
    throw new projError(e, wr.projSettings.uri, wr.run);
  }

}


export async function runOrDebugFeatureWithSelectedScenarios(wr: ProjRun, parallelMode: boolean,
  selectedScenarioQueueItems: QueueItem[]): Promise<void> {

  // runs selected scenarios in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (parallelMode && wr.debug)
      throw new Error("running parallel debug is not supported");

    const pipedScenarioNames = getPipedScenarioNames(selectedScenarioQueueItems);
    const friendlyEnvVars = getFriendlyEnvVars(wr);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    const featureFileProjectRelativePath = selectedScenarioQueueItems[0].scenario.featureFileProjectRelativePath;
    const featureFileWorkRelPath = projDirRelativePathToWorkDirRelativePath(wr, featureFileProjectRelativePath);

    const friendlyArgs = [
      "-i", `"${featureFileWorkRelPath}$"`,
      "-n", `"${pipedScenarioNames}"`,
      ...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`,
    ];
    const args = addTagsAndGetArgs(wr, friendlyArgs);

    const friendlyCmd = `${ps1}cd "${wr.projSettings.workingDirUri.fsPath}"\n` +
      `${friendlyEnvVars}${ps2}"${wr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

    if (wr.debug) {
      await debugBehaveInstance(wr, args, friendlyCmd);
      return;
    }

    await runBehaveInstance(wr, parallelMode, args, friendlyCmd);
  }
  catch (e: unknown) {
    wr.run.end();
    // unawaited (if runParallel) async func, must log the error 
    throw new projError(e, wr.projSettings.uri, wr.run);
  }

}


function getPipedFeaturePathsPattern(wr: ProjRun, parallelMode: boolean, filteredChildItems: QueueItem[]) {

  // build the -i path pattern parameter for behave
  // which is a regex of the form: 
  // features/path1/|features/path2/|features/path3/|features/path4/my.feature$|features/path5/path6/my.feature$


  // if not parallelMode, then reduce the folders to the top-level where possible
  const folderPaths: string[] = [];
  if (!parallelMode) {

    // get the user-selected folder paths
    const selectedFolderIds = wr.request.include?.filter(x => !x.uri).map(x => x.id) ?? [];

    folderPaths.push(...selectedFolderIds.map(id => vscode.workspace.asRelativePath(vscode.Uri.parse(id), false) + "/"));

    // keep only the top level folder paths (i.e. if we have a/b/c and a/b, remove a/b/c)
    folderPaths.sort((a, b) => a.localeCompare(b));
    for (let i = folderPaths.length - 1; i > 0; i--) {
      if (folderPaths[i].startsWith(folderPaths[i - 1]))
        folderPaths.splice(i, 1);
    }
  }


  // get the feature paths and remove duplicates
  const distinctFeaturePaths = [...new Set(filteredChildItems.map(qi => qi.scenario.featureFileProjectRelativePath))];

  // remove any feature path already covered by a parent folder selected by the user
  const featurePathsNotCoveredByFolderPaths = distinctFeaturePaths.filter(x => folderPaths.every(y => !x.includes(y)));

  // finally, make paths relative to the working directory
  const workRelfeaturePathsNotCoveredByFolderPaths = featurePathsNotCoveredByFolderPaths.map(x =>
    projDirRelativePathToWorkDirRelativePath(wr, x));

  // NOTE!! be careful changing the `x + "$"` to another regex!
  // you will need to retest it with nested folders/features, top level folders,
  // individual features and individual/multiple selected scenarios across both 
  // example project A and project B (B = runParallel so always runs features separately)

  // as an example of what can go wrong, currently, this would work fine:
  // cd "example-projects/project A"
  // python" -m behave -i "^behave tests/some tests/group1_features/"

  // BUT this would NOT work:
  // cd "example-projects/project B"
  // python -m behave -i "^features/grouped/"


  // BE VERY CAREFUL CHANGING THE PATTERN REGEX - SEE ABOVE NOTES AND TEST THOROUGHLY
  return folderPaths.map(x => x)
    .concat(...workRelfeaturePathsNotCoveredByFolderPaths.map(x => x + "$"))
    .join('|')
    .replaceAll("\\", "/");
}


function getPipedScenarioNames(selectedScenarios: QueueItem[]) {
  const scenarioNames: string[] = [];
  selectedScenarios.forEach(x => {
    scenarioNames.push(getScenarioRunName(x.scenario.scenarioName, x.scenario.isOutline));
  });
  const pipedScenarioNames = scenarioNames.join("|");
  return pipedScenarioNames;
}


function getScenarioRunName(scenName: string, isOutline: boolean) {
  // escape double quotes and regex special characters
  let scenarioName = scenName.replace(/[".*+?^${}()|[\]\\]/g, '\\$&');

  // scenario outline with a <param> in its name
  if (isOutline && scenarioName.includes("<"))
    scenarioName = scenarioName.replace(/<.*>/g, ".*");

  return "^" + scenarioName + (isOutline ? " -- @" : "$");
}


function getFriendlyEnvVars(wr: ProjRun) {

  let envVarString = "";
  for (const [name, value] of Object.entries(wr.env)) {
    envVarString += os.platform() === "win32" ?
      typeof value === "number" ? `$Env:${name}=${value}\n` : `$Env:${`${name}="${value.replaceAll('"', '""')}"`}\n` :
      typeof value === "number" ? `${name}=${value} ` : `${name}="${value.replaceAll('"', '\\"')}" `;
  }

  if (envVarString !== "" && os.platform() !== "win32")
    envVarString = "env " + envVarString;

  return envVarString;
}


function getPSCmdModifyIfWindows(): { ps1: string, ps2: string } {
  let ps1 = "", ps2 = "";
  if (os.platform() === "win32") {
    ps1 = `powershell commands:\n`;
    ps2 = "& ";
  }
  return { ps1, ps2 };
}


function addTagsAndGetArgs(wr: ProjRun, friendlyArgs: string[]) {
  const args = friendlyArgs.map(x => x.replaceAll('"', ""));
  if (wr.tagExpression) {
    friendlyArgs.unshift(`--tags="${wr.tagExpression}"`);
    args.unshift(`--tags=${wr.tagExpression}`);
  }
  return args;
}


function projDirRelativePathToWorkDirRelativePath(wr: ProjRun, featureFileProjectRelativePath: string) {
  return wr.projSettings.projRelativeWorkingDirPath
    ? featureFileProjectRelativePath.replace(wr.projSettings.projRelativeWorkingDirPath + "/", "")
    : featureFileProjectRelativePath;
}
