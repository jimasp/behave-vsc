import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isStepsFile } from './common';
import { getFeatureSteps } from './fileParser';
import { getStepKey, stepRe } from "./stepsParser";
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { StepReferenceDetail } from './featureParser';
import { WorkspaceSettings } from './settings';


let treeView: vscode.TreeView<vscode.TreeItem>;

export function getStepReferences(featuresUri: vscode.Uri, stepKey: string): StepReference[] {

  const allFeatureSteps = getFeatureSteps();
  // filter matches to the workspace that raised the click event
  const wkpsFeatureSteps = allFeatureSteps.filter((fs) => fs.key.startsWith(featuresUri.path));
  // then remove the featuresUriPath prefix from the keys
  const featureSteps = [...wkpsFeatureSteps].map((fs) => [fs.key.replace(`${featuresUri.path}:`, ""), fs.feature]);

  // get matches
  const featureDetails = new Map<string, StepReferenceDetail[]>();
  for (const [key, value] of featureSteps) {
    const rx = new RegExp(stepKey, "i");
    const sKey = key as string;
    const match = rx.exec(sKey);
    if (match && match.length !== 0) {
      const featureDetail = value as StepReferenceDetail;
      const stepReference = featureDetails.get(featureDetail.fileName);
      if (!stepReference)
        featureDetails.set(featureDetail.fileName, [featureDetail]);
      else
        stepReference.push(featureDetail);
    }
  }

  // convert to array of step references
  const stepReferences: StepReference[] = [];
  for (const [key, value] of featureDetails) {
    const stepReference = new StepReference(value[0].uri, key, value);
    stepReferences.push(stepReference);
  }

  return stepReferences;
}

const treeDataProvider = new StepReferencesTree();
let refreshEventUri: vscode.Uri | undefined;
let refreshMatchKeys: string[];

export function refreshStepReferencesHandler() {
  try {
    if (!refreshEventUri)
      return;
    findStepReferencesHandler(refreshEventUri, refreshMatchKeys);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    config.logger.showError(e);
  }
}


export function findStepReferencesHandler(eventUri: vscode.Uri, refreshKeys?: string[]) {

  try {

    if (!eventUri || !isStepsFile(eventUri)) {
      // this should never happen - controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${eventUri}`;
    }


    let matchKeys: string[] | undefined;
    const wkspSettings = getWorkspaceSettingsForFile(eventUri);
    const stepReferences: StepReference[] = [];


    if (refreshKeys) {
      matchKeys = refreshKeys;
    }
    else {
      matchKeys = getMatchKeys(wkspSettings);
      if (!matchKeys)
        return;

      // store in module vars for refresh
      refreshMatchKeys = matchKeys;
      refreshEventUri = eventUri;
    }

    for (const key of matchKeys) {
      const featureRefs = getStepReferences(wkspSettings.featuresUri, key);
      stepReferences.push(...featureRefs);
    }

    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);

    if (!treeView) {
      // TODO: pass this is as a pre-registered disposable
      treeView = vscode.window.createTreeView("stepReferences", { treeDataProvider });
      treeDataProvider.refresh(stepReferences);
    }
    else {
      treeDataProvider.refresh(stepReferences);
    }

    vscode.commands.executeCommand(`stepReferences.focus`);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(eventUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}


function getMatchKeys(wkspSettings: WorkspaceSettings): string[] | undefined {

  const matchKeys: string[] = [];

  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;

  let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;
  if (!line)
    return;

  line = line.trim();
  if (line == "" || !line.startsWith("def ")) {
    vscode.window.showInformationMessage('Selected line is not a step definition (does not start with "def ").');
    return;
  }

  for (let i = activeEditor.selection.active.line - 1; i > 0; i--) {
    line = activeEditor.document.lineAt(i).text;
    line = line.trim();
    if (line == "")
      continue;
    const stExec = stepRe.exec(line);
    if (!stExec || !stExec[1])
      break;
    let stepKey = getStepKey(stExec, wkspSettings.featuresUri);
    stepKey = stepKey.replace(`${wkspSettings.featuresUri.path}:`, "");
    matchKeys.push(stepKey);
  }

  return matchKeys;
}