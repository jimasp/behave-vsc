import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isFeatureFile, showTextDocumentRange } from './common';
import { getSteps } from './fileParser';
import { parseRepWildcard, StepDetail } from "./stepsParser";



export function getStepMatch(featuresUriPath: string, stepLine: string): StepDetail | undefined {

  if (stepLine.endsWith(":")) // table
    stepLine = stepLine.slice(0, -1);

  const stepRe = /^(\s*)(given|when|then|and)(.+)$/i;
  const stExec = stepRe.exec(stepLine);
  if (!stExec || !stExec[3])
    return;
  const stepText = stExec[3].trim();

  const allSteps = getSteps();
  // filter matches to the workspace that raised the click event
  const wkspSteps = new Map([...allSteps].filter(([k,]) => k.startsWith(featuresUriPath)));
  // then remove the featuresUriPath prefix from the keys
  const steps = new Map([...wkspSteps].map(([k, v]) => [k.replace(`${featuresUriPath}:`, ""), v]));

  const exactSteps = new Map([...steps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...steps].filter(([k,]) => k.includes(parseRepWildcard)));

  let stepMatch: StepDetail | undefined;

  // look for exact match
  for (const [key, value] of exactSteps) {
    const rx = new RegExp(key, "i");
    const match = rx.exec(stepText);
    if (match && match.length !== 0) {
      stepMatch = value;
      break;
    }
  }

  // got exact match - return it
  if (stepMatch)
    return stepMatch;

  // get all parameter matches
  const matches = new Map<string, StepDetail>();
  for (const [key, value] of paramsSteps) {
    const rx = new RegExp(key, "i");
    const match = rx.exec(stepText);
    if (match && match.length !== 0) {
      matches.set(key, value);
    }
  }

  // got single parameters match - return it
  if (matches.size === 1)
    return matches.values().next().value;

  // more than one parameters match - get longest matched key      
  if (matches.size > 1) {
    let longestKey = "";
    let longestKeyLength = 0;
    for (const [key,] of matches) {
      if (key.length > longestKeyLength) {
        longestKey = key;
        longestKeyLength = key.length;
      }
    }

    // return longest
    const stepMatch = matches.get(longestKey);
    return stepMatch!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
  }

  // no matches
  return undefined;
}


export async function gotoStepHandler(eventUri: vscode.Uri) {

  try {

    if (!eventUri || !isFeatureFile(eventUri)) {
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

    const wkspSettings = getWorkspaceSettingsForFile(eventUri);
    const stepMatch = getStepMatch(wkspSettings.featuresUri.path, line);

    if (!stepMatch) {
      vscode.window.showInformationMessage(`Step '${line}' not found`)
      return;
    }

    await showTextDocumentRange(stepMatch.uri, stepMatch.range);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(eventUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}