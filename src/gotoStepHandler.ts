import * as vscode from 'vscode';
import { config } from "./Configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile } from './common';
import { getStepMap } from './FileParser';
import { parseRepWildcard, StepDetail, StepMap } from "./stepsParser";
import { WorkspaceSettings } from './settings';



export function getStepMatch(wkspSettings: WorkspaceSettings, stepMap: StepMap, stepLine: string): StepDetail | undefined {

  if (stepLine.endsWith(":")) // table
    stepLine = stepLine.slice(0, -1);

  const stepRe = /^(\s*)(given|when|then|and)(.+)$/i;
  const stMatches = stepRe.exec(stepLine);
  if (!stMatches || !stMatches[3])
    return;
  const stepText = stMatches[3].trim();


  let wkspSteps = new Map([...stepMap].filter(([k,]) => k.startsWith(wkspSettings.featuresUri.path)));
  wkspSteps = new Map([...stepMap].map(([k, v]) => [k.replace(wkspSettings.featuresUri.path + ":", ""), v]));

  const exactSteps = new Map([...wkspSteps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...wkspSteps].filter(([k,]) => k.includes(parseRepWildcard)));

  let stepMatch: StepDetail | undefined = undefined;

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


export async function gotoStepHandler(eventUri: vscode.Uri) {

  try {

    if (!eventUri || !eventUri.path.endsWith(".feature")) {
      // this should never happen - controlled by package.json editor/context
      throw `Go to step definition must be used from a feature file, uri was: ${eventUri}`;
    }

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

    const stepMap = getStepMap();
    const wkspSettings = getWorkspaceSettingsForFile(eventUri);
    const stepMatch = getStepMatch(wkspSettings, stepMap, line);

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
      throw `Could not open editor for file:${stepMatch.uri.fsPath}`;
    }
    editor.selection = new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
    editor.revealRange(stepMatch.range, vscode.TextEditorRevealType.InCenter);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    const wkspUri = getWorkspaceUriForFile(eventUri);
    config.logger.showError(e, wkspUri);
  }

}