import * as vscode from 'vscode';
import { config } from "./configuration";
import { uriMatchString, getWorkspaceUriForFile, isStepsFile, showTextDocumentRange } from './common';
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { getStepMappingsForStepsFileFunction, waitOnReadyForStepsNavigation } from './stepMappings';
import { FeatureFileStep } from './featureParser';
import { funcRe } from './stepsParser';



const treeDataProvider = new StepReferencesTree();
export const treeView: vscode.TreeView<vscode.TreeItem> =
  vscode.window.createTreeView("behave-vsc_stepReferences", { showCollapseAll: true, canSelectMany: false, treeDataProvider: treeDataProvider });
treeDataProvider.setTreeView(treeView);
const refreshStore: { uri: vscode.Uri | undefined, lineNo: number } = { uri: undefined, lineNo: -1 };


function getFeatureReferencesToStepFileFunction(stepsFileUri: vscode.Uri, lineNo: number): StepReference[] {

  const stepsFileLineMappings = getStepMappingsForStepsFileFunction(stepsFileUri, lineNo);
  const featureStepMatches = new Map<string, FeatureFileStep[]>();

  stepsFileLineMappings.forEach(sm => {
    const featureKey = uriMatchString(sm.featureFileStep.uri);
    const parentFeature = featureStepMatches.get(featureKey);
    if (!parentFeature)
      featureStepMatches.set(featureKey, [sm.featureFileStep]);
    else
      parentFeature.push(sm.featureFileStep);
  });

  // convert to array of step references
  const stepReferences: StepReference[] = [];
  for (const [, featureSteps] of featureStepMatches) {
    const stepReference = new StepReference(featureSteps[0].uri, featureSteps[0].fileName, featureSteps);
    stepReferences.push(stepReference);
  }

  return stepReferences;
}


export async function findStepReferencesHandler(textEditor?: vscode.TextEditor) {

  // (textEditor param is null when called via refreshStepReferencesView)
  const fileUri = textEditor?.document.uri;

  try {

    if (textEditor && (!fileUri || !isStepsFile(fileUri))) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${fileUri}`;
    }

    if (!await waitOnReadyForStepsNavigation())
      return;

    if (textEditor) {
      const lineNo = textEditor.selection.active.line;
      const lineText = textEditor.document.lineAt(lineNo).text.trim();
      if (lineText == "" || lineText.startsWith("#"))
        return;

      if (!funcRe.test(lineText)) {
        vscode.window.showInformationMessage(`Selected line is not a function definition.`);
        return;
      }

      refreshStore.uri = fileUri;
      refreshStore.lineNo = lineNo;
    }

    if (!refreshStore.uri)
      return;

    const stepReferences = getFeatureReferencesToStepFileFunction(refreshStore.uri, refreshStore.lineNo);

    let refCount = 0;
    stepReferences.forEach(sr => refCount += sr.children.length);
    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);    

    const message = refCount === 0
      ? "No results"
      : `${refCount} result${refCount > 1 ? "s" : ""} in ${stepReferences.length} file${stepReferences.length > 1 ? "s" : ""}`;

    treeDataProvider.update(stepReferences, message);

    if (refCount === 1)
      showTextDocumentRange(stepReferences[0].resourceUri, stepReferences[0].children[0].range);

    // keep current visibility on a refresh
    if (textEditor)
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

export function refreshStepReferencesView() {
  if (!refreshStore.uri)
    return;
  findStepReferencesHandler();
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
