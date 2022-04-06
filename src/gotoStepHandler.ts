import * as vscode from 'vscode';
import config from "./configuration";
import { getSteps } from './extension';
import { StepDetail } from "./stepsParser";


export function gotoStepHandler(uri: vscode.Uri) {

  function getStepMatch(stepText: string): StepDetail | null {

    let stepMatch: StepDetail | null = null;

    const allSteps = getSteps();

    const exactSteps = new Map([...allSteps].filter(
      ([k,]) => k.indexOf('.+') === -1)
    );

    const paramsSteps = new Map([...allSteps].filter(
      ([k,]) => k.indexOf('.+') !== -1)
    );

    // exact match
    for (const [key, value] of exactSteps) {
      const rx = new RegExp(key);
      const match = rx.exec(stepText);
      if (match && match.length !== 0) {
        stepMatch = value;
        break;
      }
    }

    if (stepMatch)
      return stepMatch;

    const matches = new Map<string, StepDetail>();

    // parameters match - pick longest match
    for (const [key, value] of paramsSteps) {
      const rx = new RegExp(key);
      const match = rx.exec(stepText);
      if (match && match.length !== 0) {
        matches.set(key, value);
      }
    }

    // get longest matched key
    if (matches.size === 1)
      return matches.values().next().value;

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

    // fallback - reverse the lookup
    for (const [key, value] of allSteps) {
      const rx = new RegExp("^\\^" + stepText + ".*");
      const match = rx.exec(key);
      if (match && match.length !== 0) {
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
    if (line.endsWith(":")) // table
      line = line.slice(0, -1);

    const stepRe = /^(\s*)(given|when|then|but|and)(.+)$/i;
    const matches = stepRe.exec(line);
    if (!matches || !matches[3])
      return;

    const stepText = matches[3].trim();
    const stepMatch = getStepMatch(stepText);

    if (!stepMatch) {
      vscode.window.showInformationMessage(`Step '${stepText}' not found`)
      return;
    }

    vscode.workspace.openTextDocument(stepMatch.uri).then(doc => {
      vscode.window.showTextDocument(doc, { preview: false }).then(editor => {
        if (!editor) {
          config.logger.logError("Could not open editor for file:" + uri.fsPath)
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