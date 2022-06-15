import * as vscode from 'vscode';
import { config } from "./configuration";
import { getUriMatchString, getWorkspaceUriForFile, isStepsFile, urisMatch } from './common';
import { getStepMappings } from './fileParser';
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { FeatureFileStep } from './featureParser';
import { waitOnParseComplete } from './gotoStepHandler';


const treeDataProvider = new StepReferencesTree();
export const treeView: vscode.TreeView<vscode.TreeItem> =
  vscode.window.createTreeView("behave-vsc_stepReferences", { showCollapseAll: true, treeDataProvider: treeDataProvider });
treeDataProvider.setTreeView(treeView);
const refreshStore: { uri: vscode.Uri | undefined, lineNo: number } = { uri: undefined, lineNo: -1 };


function getReferencesToStepFunction(stepsFileUri: vscode.Uri, lineNo: number): StepReference[] {

  const stepMappingsForThisStepsFile = getStepMappings().filter(x => x.stepFileStep && urisMatch(x.stepFileStep.uri, stepsFileUri));
  const featureStepMatches = new Map<string, FeatureFileStep[]>();

  stepMappingsForThisStepsFile.forEach(sm => {
    console.log(sm.stepFileStep);
    if (sm.stepFileStep && sm.stepFileStep.funcLineNo === lineNo) {
      const featureKey = getUriMatchString(sm.featureFileStep.uri);
      const parentFeature = featureStepMatches.get(featureKey);
      if (!parentFeature)
        featureStepMatches.set(featureKey, [sm.featureFileStep]);
      else
        parentFeature.push(sm.featureFileStep);
    }
  });

  // convert to array of step references
  const stepReferences: StepReference[] = [];
  for (const [, featureSteps] of featureStepMatches) {
    const stepReference = new StepReference(featureSteps[0].uri, featureSteps[0].fileName, featureSteps);
    stepReferences.push(stepReference);
  }

  return stepReferences;
}


export async function findStepReferencesHandler(ignored?: vscode.Uri, refresh = false) {

  // we won't use a passed-in "ignored" event parameter for the uri, because the default extension keybinding 
  // in package.json doesn't provide it to this function
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;
  const fileUri = activeEditor.document.uri;

  try {

    if (!refresh && (!fileUri || !isStepsFile(fileUri))) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${fileUri}`;
    }

    if (!await waitOnParseComplete())
      return;

    if (!refresh) {
      refreshStore.uri = fileUri;
      refreshStore.lineNo = activeEditor.selection.active.line;
    }

    const stepReferences = getReferencesToStepFunction(fileUri, refreshStore.lineNo);

    let refCount = 0;
    stepReferences.forEach(sr => refCount += sr.children.length);
    const message = refCount === 0
      ? "No results"
      : `${refCount} result${refCount > 1 ? "s" : ""} in ${stepReferences.length} file${stepReferences.length > 1 ? "s" : ""}`;

    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);
    treeDataProvider.update(stepReferences, message);

    // keep current visibility on a refresh
    if (!refresh)
      vscode.commands.executeCommand(`behave-vsc_stepReferences.focus`);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(fileUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}

export function refreshStepReferencesWindow() {
  if (!refreshStore.uri)
    return;
  findStepReferencesHandler(undefined, true);
}


export function prevStepReferenceHandler() {
  try {
    treeDataProvider.prev();
  }
  catch (e: unknown) {
    // entry point function (handler) - show error   
    config.logger.showError(e);
  }
}

export function nextStepReferenceHandler() {
  try {
    treeDataProvider.next();
  }
  catch (e: unknown) {
    // entry point function (handler) - show error   
    config.logger.showError(e);
  }
}
