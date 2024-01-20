import * as vscode from "vscode";
import * as os from "os";
import { ProjRun } from "./testRunHandler";
import { QueueItem } from "../extension";


export function getPipedFeaturePathsPattern(pr: ProjRun, parallelMode: boolean, filteredChildItems: QueueItem[]) {

  // build the -i path pattern parameter for behave
  // which is a regex of the form: 
  // features/path1/|features/path2/|features/path3/|features/path4/my.feature$|features/path5/path6/my.feature$


  // if not parallelMode, then reduce the folders to the top-level where possible
  const folderPaths: string[] = [];
  if (!parallelMode) {

    // get the user-selected folder paths
    const selectedFolderIds = pr.request.include?.filter(x => !x.uri).map(x => x.id) ?? [];

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
    projDirRelativePathToWorkDirRelativePath(pr, x));

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


export function getPipedScenarioNames(selectedScenarios: QueueItem[], friendly: boolean) {
  const scenarioNames: string[] = [];
  selectedScenarios.forEach(x => {
    scenarioNames.push(getScenarioRunName(x.scenario.scenarioName, x.scenario.isOutline, friendly));
  });
  // sort the scenario names for testability
  scenarioNames.sort((a, b) => a.localeCompare(b));
  const pipedScenarioNames = scenarioNames.join("|");
  return pipedScenarioNames;
}


function getScenarioRunName(scenarioName: string, isOutline: boolean, friendly: boolean) {

  // double-escape backslashes
  scenarioName = scenarioName.replace(/\\/g, friendly ? '\\\\\\\\' : "\\\\");
  // double-escape $ to stop expansion inside quotes
  scenarioName = scenarioName.replace(/\$/g, friendly ? '\\\\$' : "\\$");
  // escape double quotes and regex special characters
  scenarioName = scenarioName.replace(/["`!.*+?^{}()|[\]]/g, '\\$&');

  // scenario outline with a <param> in its name
  if (isOutline && scenarioName.includes("<"))
    scenarioName = scenarioName.replace(/<.*>/g, ".*");

  // complete the regex
  const term = friendly ? "\\$" : "$";
  scenarioName = "^" + scenarioName + (isOutline ? " -- @" : term);
  return scenarioName;
}


export function getFriendlyEnvVars(pr: ProjRun) {

  let envVarString = "";
  for (const [name, value] of Object.entries(pr.env)) {
    envVarString += os.platform() === "win32" ?
      typeof value === "number" ? `$Env:${name}=${value}\n` : `$Env:${`${name}="${value.replaceAll('"', '""')}"`}\n` :
      typeof value === "number" ? `${name}=${value} ` : `${name}="${value.replaceAll('"', '\\"')}" `;
  }

  if (envVarString !== "" && os.platform() !== "win32")
    envVarString = "env " + envVarString;

  return envVarString;
}


export function getPSCmdModifyIfWindows(): { ps1: string, ps2: string } {
  let ps1 = "", ps2 = "";
  if (os.platform() === "win32") {
    ps1 = `powershell commands:\n`;
    ps2 = "& ";
  }
  return { ps1, ps2 };
}


export function addTags(pr: ProjRun, args: string[], scenariosOnly: boolean, friendly: boolean) {
  let argsOut: string[] = [];

  if (friendly) {
    argsOut = args;
  }
  else {
    if (scenariosOnly)
      argsOut = args.map(x => x.replace(/^"(.*)"$/, '$1'));
    else
      argsOut = args.map(x => x.replaceAll('"', ""));
  }

  if (pr.tagExpression) {
    if (friendly)
      argsOut.unshift(`--tags="${pr.tagExpression}"`);
    else
      argsOut.unshift(`--tags=${pr.tagExpression}`);
  }
  return argsOut;
}


export function projDirRelativePathToWorkDirRelativePath(pr: ProjRun, featureFileProjectRelativePath: string) {
  return pr.projSettings.projRelativeWorkingDirPath
    ? featureFileProjectRelativePath.replace(pr.projSettings.projRelativeWorkingDirPath + "/", "")
    : featureFileProjectRelativePath;
}
