import * as vscode from 'vscode';
import { services } from "../common/services";
import { uriId, getProjectUriForFile, isStepsFile, openDocumentRange } from '../common/helpers';
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { getStepMappingsForStepsFileFunction, waitOnReadyForStepsNavigation } from '../parsers/stepMappings';
import { FeatureFileStep } from '../parsers/featureParser';
import { funcRe } from '../parsers/stepsParser';



const treeDataProvider = new StepReferencesTree();
export const treeView: vscode.TreeView<vscode.TreeItem> =
  vscode.window.createTreeView("StepReferences", { showCollapseAll: true, canSelectMany: false, treeDataProvider: treeDataProvider });
treeDataProvider.setTreeView(treeView);
const refreshStore: { uri: vscode.Uri | undefined, lineNo: number } = { uri: undefined, lineNo: -1 };


function getFeatureReferencesToStepFileFunction(stepsFileUri: vscode.Uri, lineNo: number): StepReference[] {

  const stepsFileLineMappings = getStepMappingsForStepsFileFunction(stepsFileUri, lineNo);
  const featureStepMatches = new Map<string, FeatureFileStep[]>();

  stepsFileLineMappings.forEach(sm => {
    const featureKey = uriId(sm.featureFileStep.uri);
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

  // keep consistent sort order when refresh from file save
  stepReferences.sort((a, b) => a.resourceUri.path < b.resourceUri.path ? -1 : 1);

  return stepReferences;
}


export async function findStepReferencesHandler(textEditor?: vscode.TextEditor) {

  // (textEditor param is null when called via refreshStepReferencesView)
  const fileUri = textEditor?.document.uri;

  try {

    if (textEditor && (!fileUri || !await isStepsFile(fileUri))) {
      // note that context menu command availability is controlled by the package.json editor/context "when" clause 
      services.logger.showWarn("Find All Step References must be used from a python file in a (non-stage) steps path, " +
        "(i.e. /steps/ or a behave-vsc.importedSteps setting path). Project-relative file path was: " +
        `"${fileUri ? vscode.workspace.asRelativePath(fileUri, false) : "undefined"}"`, getProjectUriForFile(fileUri));
      return;
    }

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

    const waitMs = textEditor ? 500 : 5000;
    if (!await waitOnReadyForStepsNavigation(waitMs))
      return;

    const stepReferences = getFeatureReferencesToStepFileFunction(refreshStore.uri, refreshStore.lineNo);

    let refCount = 0;
    stepReferences.forEach(sr => refCount += sr.children.length);

    const message = refCount === 0
      ? "No results"
      : `${refCount} result${refCount > 1 ? "s" : ""} in ${stepReferences.length} file${stepReferences.length > 1 ? "s" : ""}`;

    treeDataProvider.update(stepReferences, message);

    // if no textEditor, this is a refresh, so keep current focus 
    if (!textEditor)
      return;

    if (refCount === 1) {
      // single reference, open it
      openDocumentRange(stepReferences[0].resourceUri, stepReferences[0].children[0].range, false);
    }
    else {
      // show step references window
      // (don't use treeView.reveal() here, it's behaviour is inconsistent for focusing on the view when flipping between files/views)
      vscode.commands.executeCommand(`StepReferences.focus`);
    }
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const projUri = getProjectUriForFile(fileUri);
      services.logger.showError(e, projUri);
    }
    catch {
      services.logger.showError(e);
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
    services.logger.showError(e);
  }
}

export function nextStepReferenceHandler() {
  try {
    treeDataProvider.next();
  }
  catch (e: unknown) {
    // entry point function (handler) - show error   
    services.logger.showError(e);
  }
}
