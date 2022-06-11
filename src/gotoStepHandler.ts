import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isFeatureFile, sepr, showTextDocumentRange } from './common';
import { getSteps } from './fileParser';
import { parseRepWildcard, StepDetail } from "./stepsParser";



export function getStepMatch(featuresUriPath: string, stepText: string): StepDetail | undefined {

  const findExactMatch = (stepText: string) => {
    for (const [key, value] of exactSteps) {
      const rx = new RegExp(key, "i");
      const match = rx.exec(stepText);
      if (match && match.length !== 0) {
        return value;
      }
    }
  }

  const findParamsMatch = (stepText: string) => {
    const matches = new Map<string, StepDetail>();
    for (const [key, value] of paramsSteps) {
      const rx = new RegExp(key, "i");
      const match = rx.exec(stepText);
      if (match && match.length !== 0) {
        matches.set(key, value);
      }
    }
    return matches;
  }

  const findLongestParamsMatch = (paramsMatches: Map<string, StepDetail>) => {
    let longestKey = "";
    let longestKeyLength = 0;
    for (const [key,] of paramsMatches) {
      if (key.length > longestKeyLength) {
        longestKey = key;
        longestKeyLength = key.length;
      }
    }

    // return longest
    const stepMatch = paramsMatches.get(longestKey);
    return stepMatch!; // eslint-disable-line @typescript-eslint/no-non-null-assertion    
  }


  const allSteps = getSteps();
  // filter matches to the workspace that raised the click event
  const wkspSteps = new Map([...allSteps].filter(([k,]) => k.startsWith(featuresUriPath)));
  // then remove the featuresUriPath prefix from the keys
  const steps = new Map([...wkspSteps].map(([k, v]) => [k.replace(`${featuresUriPath}:`, ""), v]));

  const exactSteps = new Map([...steps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...steps].filter(([k,]) => k.includes(parseRepWildcard)));


  let match: StepDetail | undefined;
  const split = stepText.split(sepr);
  const stepMatchTypes = getStepMatchTypes(split[0]);
  const matchStr = split[1];

  for (const matchType of stepMatchTypes) {
    const stepTextWithType = matchType + sepr + matchStr;

    match = findExactMatch(stepTextWithType);
    if (!match) {
      const idx = stepTextWithType.indexOf(sepr);
      match = findExactMatch("step" + stepTextWithType.substring(idx));
    }

    // got exact match - return it
    if (match)
      return match;

    const paramsMatches = findParamsMatch(stepTextWithType);

    // got single parameters match - return it
    if (paramsMatches.size === 1)
      return paramsMatches.values().next().value;

    // more than one parameters match - get longest matched key      
    if (paramsMatches.size > 1) {
      return findLongestParamsMatch(paramsMatches);
    }
  }

  // no matches
  return undefined;
}

function getStepMatchTypes(stepType: string): string[] {
  if (stepType === "and")
    return ["given", "then", "step"];
  if (stepType === "but")
    return ["then", "step"];
  return [stepType, "step"];
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
    const stepText = getStepMatchText(line);
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


export function getStepMatchText(line: string): string | undefined {
  if (!line)
    return;

  line = line.trim();
  if (line == "" || line.startsWith("#"))
    return;

  if (line.endsWith(":")) // table
    line = line.slice(0, -1);

  const stepRe = /^(\s*)(given |and |when |then |but )(.+)$/i;
  const stExec = stepRe.exec(line);
  if (!stExec) {
    vscode.window.showInformationMessage('Selected line does not start with "given/and/when/then/but"');
    return;
  }

  return `${stExec[2].trim().toLowerCase()}${sepr}${stExec[3].trim()}`;
}

