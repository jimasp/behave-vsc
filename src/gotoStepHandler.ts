import * as vscode from 'vscode';
import config from "./configuration";
import { getSteps } from './extension';
import { StepDetail } from "./stepsParser";


export function gotoStepHandler(uri: vscode.Uri) {

  function getStepMatch(stepText:string): StepDetail|null {

    let stepMatch:StepDetail|null = null;

    const steps = getSteps();

    for(const[key, value] of steps) {
      const rx = new RegExp(key);
      const match = rx.exec(stepText);
      if(match && match.length !== 0)  {
        stepMatch = value;
        break;
      }
    }

    if(stepMatch)
      return stepMatch;

    // fallback - reverse the lookup
    for(const[key, value] of steps) {
      const rx = new RegExp("^\\^" + stepText + ".*");
      const match = rx.exec(key);
      if(match && match.length !== 0)  {
        stepMatch = value;
        break;
      }
    }
  
    return stepMatch;
  }

  try {  
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    
    let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text.trim();
    if(line.endsWith(":")) // table
      line = line.slice(0,-1);

    const stepRe = /^(\s*)(given|when|then|but|and)(.+)$/i;
    const matches = stepRe.exec(line);
    if(!matches || !matches[3])
      return;

    const stepText = matches[3].trim();
    const stepMatch = getStepMatch(stepText);

    if(!stepMatch) {
      vscode.window.showInformationMessage(`Step '${stepText}' not found`)
      return;
    }

    vscode.workspace.openTextDocument(stepMatch.uri).then(doc => {
      vscode.window.showTextDocument(doc, {preview:false}).then(editor => {
        if(!editor) {
          config.logger.logError("Could not open editor for file:" + uri.fsPath)
          return;
        }
        editor.selection =  new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
        editor.revealRange(stepMatch.range);
      });
    });   
    
  }
  catch(e:unknown) {
    config.logger.logError(e);
  }

}