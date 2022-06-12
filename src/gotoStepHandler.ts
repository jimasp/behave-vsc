import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isFeatureFile, sepr, showTextDocumentRange, WkspError } from './common';
import { getSteps } from './fileParser';
import { parser } from './extension';
import { parseRepWildcard, StepDetail } from "./stepsParser";
import { diagLog, DiagLogType } from './logger';


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
  const steps = new Map([...wkspSteps].map(([k, v]) => [k.replace(`${featuresUriPath}${sepr}`, ""), v]));

  const exactSteps = new Map([...steps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...steps].filter(([k,]) => k.includes(parseRepWildcard)));



  // any feature file step must map to a single python step function 
  // so this function should return the SINGLE best match

  let stepSwap: string | undefined;
  if (!stepText.startsWith("step")) {
    const idx = stepText.indexOf(sepr);
    stepSwap = "step" + stepText.substring(idx);
  }

  let exactMatch = findExactMatch(stepText);
  if (!exactMatch && stepSwap)
    exactMatch = findExactMatch(stepSwap);

  // got exact match - return it
  if (exactMatch)
    return exactMatch;

  // look for a parameters match, e.g. {something1} {something2}
  let paramsMatches = findParamsMatch(stepText);
  if (paramsMatches.size === 0 && stepSwap)
    paramsMatches = findParamsMatch(stepSwap);

  // got single parameters match - return it
  if (paramsMatches.size === 1)
    return paramsMatches.values().next().value;

  // more than one parameters match - get longest matched key      
  if (paramsMatches.size > 1) {
    return findLongestParamsMatch(paramsMatches);
  }

  // no matches
  return undefined;
}

export async function waitOnReadyForStepsNavigation() {
  const ready = await parser.readyForStepsNavigation(500, "checkReadyForStepsNavigation");
  if (!ready) {
    const msg = "Cannot navigate steps while step files are being parsed, please try again.";
    diagLog(msg, undefined, DiagLogType.warn);
    vscode.window.showWarningMessage(msg);
    return false;
  }
  return true;
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

    if (!await waitOnReadyForStepsNavigation())
      return;

    const lineNo = activeEditor.selection.active.line;
    const line = activeEditor.document.lineAt(lineNo).text;
    const wkspSettings = getWorkspaceSettingsForFile(docUri);
    const content = activeEditor.document.getText();
    const stepText = getStepMatchText(content, line, lineNo);
    if (!stepText)
      return;

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


export function getStepMatchText(content: string, line: string, lineNum: number): string | undefined {
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

  const lines = content.split("\n");

  let stepType = stExec[2].trim().toLowerCase();
  if (stepType === "and" || stepType === "but") {
    for (let lineNo = lineNum - 1; lineNo > 0; lineNo--) {

      const line = lines[lineNo].trim();
      if (line.startsWith(stepType))
        continue;
      if (line === '' || line.startsWith("#"))
        continue;

      const stExec = stepRe.exec(line);
      if (!stExec)
        throw `could not determine step type for '${line}`;

      stepType = stExec[2].trim().toLowerCase();
      if (stepType === "and" || stepType === "but")
        continue;

      break;
    }
  }

  return `${stepType}${sepr}${stExec[3].trim()}`;
}
