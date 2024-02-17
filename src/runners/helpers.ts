import * as vscode from "vscode";
import * as os from "os";
import { ProjRun } from "./testRunHandler";
import { QueueItem } from "../extension";



export function getOptimisedFeaturePathsRegEx(pr: ProjRun, scenarioQueueItems: QueueItem[]) {

  function getRegEx(featureFileProjectRelativePath: string) {
    const workDirRelFeaturePath = projDirRelativePathToWorkDirRelativePath(pr, featureFileProjectRelativePath);

    // NOTE: be careful changing this regex:

    // currently, this will work fine with behave:
    // cd "example-projects/project A"
    // python" -m behave -i "^behave tests/some tests/group1_features/"

    // BUT this will NOT work:
    // cd "example-projects/project B"
    // python -m behave -i "^features/grouped/"    
    return workDirRelFeaturePath + "$";
  }

  // runParallel only runs one feature at a time, so we can simply use the single featuresPath to create the regex
  if (pr.projSettings.runParallel)
    return getRegEx(scenarioQueueItems[0].scenario.featureFileProjectRelativePath);


  // build an optimised -i path pattern parameter for behave 
  // which is a regex of the form: 
  // features/path1/|features/path2/|features/path3/|features/path4/my.feature$|features/path5/path6/my.feature$

  // get the user-selected folders paths
  const selectedFolderIds = pr.request.include?.filter(x => !x.uri).map(x => x.id) ?? [];

  // remove any scenarios already covered by a parent folder selected by the user
  const scenariosNotCoveredBySelectedFolders = scenarioQueueItems.filter(x => !selectedFolderIds.includes(x.test.parent?.parent?.id ?? ''));

  // Filter out scenarios where all the siblings of the parent feature are selected, and add the parent folder of those features instead,
  // (i.e. where the parent folder is effectively selected because all the children of the folder are selected).
  // Note that in the case of nested folders, those siblings will include folders, not just features.
  let allMatched = true;
  const parentFoldersProcessed: string[] = [];
  let filteredScenarioQueueItems = [...scenariosNotCoveredBySelectedFolders];

  for (const scenario of scenariosNotCoveredBySelectedFolders) {
    const parentFolder = scenario.test.parent?.parent;
    if (!parentFolder || parentFoldersProcessed.includes(parentFolder.id))
      continue;
    parentFoldersProcessed.push(parentFolder.id);
    const siblingIds: string[] = [];
    // sibling can be a feature or a folder
    for (const sibling of parentFolder.children) {
      siblingIds.push(sibling[0]);
      if (!scenariosNotCoveredBySelectedFolders.find(x =>
        x.test.id.startsWith(sibling[0] + "/")) && !selectedFolderIds.includes(sibling[0])) {
        allMatched = false;
        break;
      }
    }
    if (allMatched) {
      filteredScenarioQueueItems = scenarioQueueItems.filter(x => siblingIds.includes(x.test.id));
      selectedFolderIds.push(parentFolder.id);
    }
  }

  // convert folder ids to relative paths
  let selectedFolderPaths = [...selectedFolderIds.map(id => vscode.workspace.asRelativePath(vscode.Uri.parse(id), false) + "/")];

  // keep only the top level folder paths (i.e. if we have a/b/c and a/b, remove a/b/c)
  selectedFolderPaths = selectedFolderPaths.filter(x => !selectedFolderPaths.some(y => x !== y && x.startsWith(y)));

  // get the feature paths and remove duplicates
  const distinctFeaturePaths = [...new Set(filteredScenarioQueueItems.map(qi => qi.scenario.featureFileProjectRelativePath))];

  // sort the paths for consistency (testability)
  distinctFeaturePaths.sort((a, b) => a.localeCompare(b));
  selectedFolderPaths.sort((a, b) => a.localeCompare(b));

  // concatenate the folder and feature paths
  const result = selectedFolderPaths.map(x => x)
    .concat(...distinctFeaturePaths.map(getRegEx))
    .join('|')
    .replaceAll("\\", "/");

  console.log(result);
  return result;
}


export function getPipedScenarioNamesRegex(selectedScenarios: QueueItem[], friendly: boolean) {
  const scenarioNames: string[] = [];
  selectedScenarios.forEach(x => {
    scenarioNames.push(getScenarioNameRegEx(x.scenario.scenarioName, x.scenario.isOutline, friendly));
  });
  // sort the scenario names for consistency (testability)
  scenarioNames.sort((a, b) => a.localeCompare(b));
  const pipedScenarioNames = scenarioNames.join("|");
  return pipedScenarioNames;
}


function getScenarioNameRegEx(scenarioName: string, isOutline: boolean, friendly: boolean) {

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


export function projDirRelativePathToWorkDirRelativePath(pr: ProjRun, projectRelativePath: string) {
  return pr.projSettings.projRelativeBehaveWorkingDirPath
    ? projectRelativePath.replace(pr.projSettings.projRelativeBehaveWorkingDirPath + "/", "")
    : projectRelativePath;
}
