import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isFeatureFile, showTextDocumentRange } from './common';
import { getSteps } from './fileParser';
import { parseRepWildcard, StepDetail } from "./stepsParser";



export function getStepMatch(featuresUriPath: string, stepText: string): StepDetail | undefined {

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

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    const line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;
    const stepText = getStepText(line);
    if (!stepText)
      return;

    const wkspSettings = getWorkspaceSettingsForFile(docUri);
    const stepMatch = getStepMatch(wkspSettings.featuresUri.path, stepText);

    if (!stepMatch) {
      vscode.window.showInformationMessage(`Step '${line}' not found`)
      return;
    }

    await showTextDocumentRange(stepMatch.uri, stepMatch.range);
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


export function getStepText(line: string): string | undefined {
  if (!line)
    return;

  line = line.trim();
  if (line == "" || line.startsWith("#"))
    return;

  if (line.endsWith(":")) // table
    line = line.slice(0, -1);

  const stepRe = /^(\s*)(given |when |then |and )(.+)$/i;
  const stExec = stepRe.exec(line);
  if (!stExec || !stExec[3]) {
    vscode.window.showInformationMessage('Selected line does not start with "Given /When /Then /And "');
    return;
  }

  return stExec[3].trim();
}