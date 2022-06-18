import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceUriForFile, isFeatureFile, showTextDocumentRange } from './common';
import { getStepMappingForFeatureFileLine, waitOnReadyForStepsNavigation } from './stepMappings';



export async function gotoStepHandler() {

  // we won't use a passed-in event parameter, because the default extension keybinding 
  // in package.json doesn't provide it to this function
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;

  const docUri = activeEditor.document.uri;

  try {

    if (!docUri || !isFeatureFile(docUri)) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Go to step definition must be used from a feature file, uri was: ${docUri}`;
    }

    if (!await waitOnReadyForStepsNavigation())
      return;

    const lineNo = activeEditor.selection.active.line;
    let lineText = activeEditor.document.lineAt(lineNo).text;
    if (!lineText)
      return;
    lineText = lineText.trim();
    if (lineText == "" || lineText.startsWith("#"))
      return;

    const stepRe = /^(\s*)(given |and |when |then |but )(.+)$/i;
    const stExec = stepRe.exec(lineText);
    if (!stExec) {
      vscode.window.showInformationMessage(`Selected line is not a step.`);
      return;
    }

    const stepFileStep = getStepMappingForFeatureFileLine(docUri, lineNo);

    if (!stepFileStep) {
      vscode.window.showInformationMessage(`Step '${activeEditor.document.lineAt(lineNo).text}' not found`)
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
