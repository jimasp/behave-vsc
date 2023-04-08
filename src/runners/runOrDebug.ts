import * as vscode from 'vscode';
import * as os from 'os';
import { WorkspaceSettings } from "../settings";
import { runBehaveInstance } from './behaveRun';
import { debugBehaveInstance } from './behaveDebug';
import { QueueItem } from '../extension';
import { WkspError } from '../common';
import { WkspRun } from './testRunHandler';



// hard-code any settings we MUST have (i.e. override user behave.ini file only where absolutely necessary)
const OVERRIDE_ARGS = [
  "--show-skipped", // show-skipped is required for skipped tests to produce junit output
  "--junit",
  "--junit-directory"
];


export async function runOrDebugAllFeaturesInOneInstance(wr: WkspRun): Promise<void> {
  // runs all features in a single instance of behave

  const friendlyEnvVars = getFriendlyEnvVars(wr.wkspSettings);
  const { ps1, ps2 } = getPSCmdModifyIfWindows();

  const friendlyArgs = [...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`];
  const args = friendlyArgsToArgs(friendlyArgs);

  const friendlyCmd = `${ps1}cd "${wr.wkspSettings.uri.fsPath}"\n` +
    `${friendlyEnvVars}${ps2}"${wr.pythonExec}" -m behave ${friendlyArgs.join(" ")}`;

  if (wr.debug) {
    await debugBehaveInstance(wr, args, friendlyCmd);
    return;
  }

  await runBehaveInstance(wr, false, args, friendlyCmd);
}


export async function runOrDebugFeatures(wr: WkspRun, parallelMode: boolean, featureUris: vscode.Uri[]): Promise<void> {

  // runs selected features in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (parallelMode && wr.debug)
      throw new Error("running async debug is not supported");

    const pipedPathPatterns = getOptimisedPipedFeaturePathsPattern(wr, parallelMode, featureUris);
    const friendlyEnvVars = getFriendlyEnvVars(wr.wkspSettings);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();

    const friendlyArgs = [...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`, "-i", `"${pipedPathPatterns}"`];
    const args = friendlyArgsToArgs(friendlyArgs);

    const friendlyCmd = `${ps1}cd "${wr.wkspSettings.uri.fsPath}"\n` +
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
    throw new WkspError(e, wr.wkspSettings.uri, wr.run);
  }

}


export async function runOrDebugFeatureWithSelectedChildren(wr: WkspRun, parallelMode: boolean,
  selectedQueueItems: QueueItem[]): Promise<void> {

  // runs selected scenarios in a single instance of behave
  // (if we are in parallelMode, then up the stack this will be called without await)

  try {

    if (parallelMode && wr.debug)
      throw new Error("running parallel debug is not supported");

    const pipedScenarioNames = getPipedItems(selectedQueueItems);
    const friendlyEnvVars = getFriendlyEnvVars(wr.wkspSettings);
    const { ps1, ps2 } = getPSCmdModifyIfWindows();
    const featureFileWorkspaceRelativePath = selectedQueueItems[0].qItem.featureFileWorkspaceRelativePath;

    const friendlyArgs = [
      ...OVERRIDE_ARGS, `"${wr.junitRunDirUri.fsPath}"`, "-i",
      `"${featureFileWorkspaceRelativePath}$"`, "-n", `"${pipedScenarioNames}"`
    ];
    const args = friendlyArgsToArgs(friendlyArgs);

    const friendlyCmd = `${ps1}cd "${wr.wkspSettings.uri.fsPath}"\n` +
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
    throw new WkspError(e, wr.wkspSettings.uri, wr.run);
  }

}


function getOptimisedPipedFeaturePathsPattern(wr: WkspRun, parallelMode: boolean, featureUris: vscode.Uri[]) {

  // build the -i path pattern parameter for behave
  // which is a regex of the form: 
  // features/path1/|features/path2/|features/path3/|features/path4/my.feature$|features/path5/path6/my.feature$


  // reduce the folders to the top-level where possible
  const folderPaths: string[] = [];
  if (!parallelMode) {

    // get the user-selected folder paths
    const selectedFolderIds = wr.request.include?.filter(x => !x.uri).map(x => x.id) ?? [];

    folderPaths.push(...selectedFolderIds.map(id => vscode.workspace.asRelativePath(vscode.Uri.parse(id), false) + "/"));

    // keep only the top level folder paths (i.e. if we have a/b/c and a/b, remove a/b/c)
    folderPaths.sort();
    for (let i = folderPaths.length - 1; i > 0; i--) {
      if (folderPaths[i].startsWith(folderPaths[i - 1]))
        folderPaths.splice(i, 1);
    }
  }


  // get the feature paths 
  const featureFilesRelativePaths = featureUris.map(uri => vscode.workspace.asRelativePath(uri, false));

  // remove any feature path already covered by a parent folder selected by the user
  const featurePathsNotCoveredByFolderPaths = featureFilesRelativePaths.filter(x => folderPaths.every(y => !x.includes(y)));

  // note - be careful changing this regex - you will need to retest it with nested folders/features, top level folders,
  // individual features and individual/multiple selected scenarios across both example project A and project B

  // as an example of what can go wrong, currently, this would work fine:
  // cd "example-projects/project A"
  // python" -m behave -i "^behave tests/some tests/group1_features/"

  // BUT this would NOT work:
  // cd "example-projects/project B"
  // python -m behave -i "^features/grouped/"



  // BE VERY CAREFUL CHANGING THE PATTERN REGEX - SEE ABOVE NOTES AND TEST THOROUGHLY
  return folderPaths.map(x => x)
    .concat(...featurePathsNotCoveredByFolderPaths.map(x => x + "$"))
    .join('|')
    .replaceAll("\\", "/");
}


function getPipedItems(selectedItems: QueueItem[]) {
  const scenarioNames: string[] = [];
  selectedItems.forEach(x => scenarioNames.push(x.qItem.runName));
  const pipedScenarioNames = scenarioNames.join("|");
  return pipedScenarioNames;
}


function getFriendlyEnvVars(wkspSettings: WorkspaceSettings) {
  let envVars = "";

  for (const [name, value] of Object.entries(wkspSettings.envVarOverrides)) {
    envVars += os.platform() === "win32" ?
      typeof value === "number" ? `$Env:${name}=${value}\n` : `$Env:${`${name}="${value.replace('"', '""')}"`}\n` :
      typeof value === "number" ? `${name}=${value} ` : `${name}="${value.replace('"', '\\"')}" `;
  }

  return envVars;
}


function friendlyArgsToArgs(friendlyArgs: string[]): string[] {
  return friendlyArgs.map(x => x.replace(/(?<!\\)"/g, ""));
}


function getPSCmdModifyIfWindows(): { ps1: string, ps2: string } {
  let ps1 = "", ps2 = "";
  if (os.platform() === "win32") {
    ps1 = `powershell commands:\n`;
    ps2 = "& ";
  }
  return { ps1, ps2 };
}
