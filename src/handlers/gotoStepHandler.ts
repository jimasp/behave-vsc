import * as vscode from 'vscode';
import { services } from "../common/services";
import { getProjectUriForFile, isFeatureFile, openDocumentRange } from '../common/helpers';
import { getStepFileStepForFeatureFileStep, waitOnReadyForStepsNavigation } from '../parsers/stepMappings';
import { featureFileStepRe } from '../parsers/featureParser';



export async function gotoStepHandler(textEditor: vscode.TextEditor) {

  const docUri = textEditor.document.uri;

  try {

    if (!docUri || !isFeatureFile(docUri)) {
      // note that context menu command availability is controlled by the package.json editor/context "when" clause 
      services.logger.showWarn("Go to step definition must be used from a feature file path. Project-relative file path was" +
        `"${docUri ? vscode.workspace.asRelativePath(docUri, false) : "undefined"}`, getProjectUriForFile(docUri));
      return;
    }

    const lineNo = textEditor.selection.active.line;
    const lineText = textEditor.document.lineAt(lineNo).text.trim();
    const stExec = featureFileStepRe.exec(lineText);
    if (!stExec) {
      vscode.window.showInformationMessage(`Selected line is not a step.`);
      return;
    }

    if (!await waitOnReadyForStepsNavigation(500, docUri))
      return;

    const stepFileStep = getStepFileStepForFeatureFileStep(docUri, lineNo);

    if (!stepFileStep) {
      vscode.window.showInformationMessage(`Step '${lineText}' not found.`);
      return;
    }

    await openDocumentRange(stepFileStep.uri, stepFileStep.functionDefinitionRange, false);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const projUri = getProjectUriForFile(docUri);
      services.logger.showError(e, projUri);
    }
    catch {
      services.logger.showError(e);
    }
  }

}
