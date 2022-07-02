import * as vscode from 'vscode';
import { config } from "../configuration";
import { getWorkspaceUriForFile, isFeatureFile, openDocumentRange } from '../common';
import { getStepFileStepForFeatureFileStep, waitOnReadyForStepsNavigation } from '../parsing/stepMappings';
import { featureFileStepRe } from '../parsing/featureParser';



export async function gotoStepHandler(textEditor: vscode.TextEditor) {

  const docUri = textEditor.document.uri;

  try {

    if (!docUri || !isFeatureFile(docUri)) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Go to step definition must be used from a feature file, uri was: ${docUri}`;
    }

    if (!await waitOnReadyForStepsNavigation())
      return;

    const lineNo = textEditor.selection.active.line;
    const lineText = textEditor.document.lineAt(lineNo).text.trim();
    const stExec = featureFileStepRe.exec(lineText);
    if (!stExec) {
      vscode.window.showInformationMessage(`Selected line is not a step.`);
      return;
    }

    const stepFileStep = getStepFileStepForFeatureFileStep(docUri, lineNo);

    if (!stepFileStep) {
      vscode.window.showInformationMessage(`Step '${lineText}' not found (or file has not been saved).`);
      return;
    }

    await openDocumentRange(stepFileStep.uri, stepFileStep.functionDefinitionRange, false);
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
