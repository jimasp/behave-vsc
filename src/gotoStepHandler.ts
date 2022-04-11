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

  return stepMatch;
}


export async function gotoStepHandler() {

  try {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;

    if (!line)
      return;

    line = line.trim();
    if (line == "" || line.startsWith("#"))
      return;

    const allSteps = getSteps();
    const stepMatch = getStepMatch(allSteps, line);

    if (!stepMatch) {
      vscode.window.showInformationMessage(`Step '${line}' not found`)
      return;
    }

    // note openTextDocument(stepMatch.Uri) does not behave the same as
    // openTextDocument(vscode.Uri.file(stepMatch.uri.path))
    // e.g. in the first case, if the user discards (reverts) a git file change the file would open as readonly
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(stepMatch.uri.path));
    const editor = await vscode.window.showTextDocument(doc, { preview: false });
    if (!editor) {
      config.logger.logError("Could not open editor for file:" + stepMatch.uri.fsPath);
      return;
    }
    editor.selection = new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
    editor.revealRange(stepMatch.range);
  }
  catch (e: unknown) {
    config.logger.logError(e);
  }

}