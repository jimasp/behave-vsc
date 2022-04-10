import * as vscode from 'vscode';
import config from "./configuration";
import { getSteps } from './extension';
import { parseRepWildcard, StepDetail, Steps } from "./stepsParser";

export const stepMatchRe = /^(\s*)(given|when|then|and)(.+)$/i;


export function getStepMatch(allSteps: Steps, stepLine: string): StepDetail | undefined {

  let stepMatch: StepDetail | undefined = undefined;

  if (stepLine.endsWith(":")) // table
    stepLine = stepLine.slice(0, -1);

  const stepRe = /^(\s*)(given|when|then|and)(.+)$/i;
  const stMatches = stepRe.exec(stepLine);
  if (!stMatches || !stMatches[3])
    return;

  const stepText = stMatches[3].trim();

  const exactSteps = new Map([...allSteps].filter(
    ([k,]) => k.indexOf(parseRepWildcard) === -1)
  );

  const paramsSteps = new Map([...allSteps].filter(
    ([k,]) => k.indexOf(parseRepWildcard) !== -1)
  );

  // exact match
  for (const [key, value] of exactSteps) {
    const rx = new RegExp(key, "i");
    const match = rx.exec(stepText);
    if (match && match.length !== 0) {
      stepMatch = value;
      break;
    }
  }

  if (stepMatch)
    return stepMatch;



  // parameters match - pick longest match

  const matches = new Map<string, StepDetail>();

  for (const [key, value] of paramsSteps) {
    const rx = new RegExp(key, "i");
    const match = rx.exec(stepText);
    if (match && match.length !== 0) {
      matches.set(key, value);
    }
  }


  if (matches.size === 1)
    return matches.values().next().value;

  // get longest matched key      
  if (matches.size > 1) {
    let longestKey = "";
    let longestKeyLength = 0;
    for (const [key,] of matches) {
      if (key.length > longestKeyLength) {
        longestKey = key;
        longestKeyLength = key.length;
      }
    }

    const stepMatch = matches.get(longestKey);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return stepMatch!;
  }


  // fallback match - reverse the lookup
  for (const [key, value] of allSteps) {
    const rx = new RegExp("^\\^" + stepText + ".*", "i");
    const match = rx.exec(key);
    if (match && match.length !== 0) {
      stepMatch = value;
      break;
    }
  }

  return stepMatch;
}


export async function gotoStepHandler(uri: vscode.Uri) {

  try {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    const line = activeEditor.document.lineAt(activeEditor.selection.active.line).text.trim();

    const allSteps = getSteps();
    const stepMatch = getStepMatch(allSteps, line);

    if (!stepMatch) {
      vscode.window.showInformationMessage(`Step '${line}' not found`)
      return;
    }

    vscode.workspace.openTextDocument(stepMatch.uri).then(doc => {
      vscode.window.showTextDocument(doc, { preview: false }).then(editor => {
        if (!editor) {
          config.logger.logError("Could not open editor for file:" + stepMatch.uri.fsPath);
          return;
        }
        editor.selection = new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
        editor.revealRange(stepMatch.range);
      });
    });

  }
  catch (e: unknown) {
    config.logger.logError(e);
  }

}