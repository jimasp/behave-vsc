import * as vscode from 'vscode';
import { config } from "./configuration";
import { afterSepr, getUriMatchString, getWorkspaceSettingsForFile, getWorkspaceUriForFile, isStepsFile } from './common';
import { getFeatureSteps } from './fileParser';
import { getStepKey, stepRe } from "./stepsParser";
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { StepReferenceDetail } from './featureParser';
import { WorkspaceSettings } from './settings';


let treeView: vscode.TreeView<vscode.TreeItem>;

export function getStepReferences(featuresUri: vscode.Uri, stepKey: string): StepReference[] {

  const allFeatureSteps = getFeatureSteps();
  const featuresUriMatchString = getUriMatchString(featuresUri);
  // filter matches to the workspace that raised the click event
  const wkpsFeatureSteps = allFeatureSteps.filter((fs) => fs.key.startsWith(featuresUriMatchString));
  // then remove the fileUri match string prefix from the keys
  const featureSteps = [...wkpsFeatureSteps].map((fs) => [afterSepr(fs.key), fs.feature]);

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


export function findStepReferencesHandler(event: vscode.Uri, refreshKeys?: string[]) {

  // we won't use a passed-in event parameter, because the default extension keybinding 
  // in package.json doesn't provide it to this function
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;

  const docUri = activeEditor.document.uri;

  try {

    if (!docUri || !isStepsFile(docUri)) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${docUri}`;
    }


    let matchKeys: string[] | undefined;
    const wkspSettings = getWorkspaceSettingsForFile(docUri);
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
      refreshEventUri = docUri;
    }

    for (const key of matchKeys) {
      const featureRefs = getStepReferences(wkspSettings.featuresUri, key);
      stepReferences.push(...featureRefs);
    }

    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);

    if (!treeView) {
      // TODO: pass this is as a pre-registered disposable
      treeView = vscode.window.createTreeView("behave-vsc_stepReferences", { showCollapseAll: true, treeDataProvider });
      treeDataProvider.update(stepReferences, treeView);
    }
    else {
      treeDataProvider.update(stepReferences, treeView);
    }

    // refresh can be called from code, but will already be shown if a user click, so keep current visibility
    if (!refreshKeys)
      vscode.commands.executeCommand(`behave-vsc_stepReferences.focus`);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(docUri);
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
  if (line == "" || (!line.startsWith("def ") && !line.startsWith("async def "))) {
    vscode.window.showInformationMessage('Selected line is not a step function definition.');
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