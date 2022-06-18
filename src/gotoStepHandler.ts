import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceUriForFile, isFeatureFile, showTextDocumentRange } from './common';
import { getStepMappingForFeatureFileLine, waitOnReadyForStepsNavigation } from './stepMappings';
import { featureStepRe } from './featureParser';



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
    const stExec = featureStepRe.exec(lineText);
    if (!stExec) {
      vscode.window.showInformationMessage(`Selected line is not a step.`);
      return;
    }

    const stepFileStep = getStepMappingForFeatureFileLine(docUri, lineNo);

    if (!stepFileStep) {
      vscode.window.showInformationMessage(`Step '${textEditor.document.lineAt(lineNo).text}' not found`)
      return;
    }

    await showTextDocumentRange(stepFileStep.uri, stepFileStep.range);
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
