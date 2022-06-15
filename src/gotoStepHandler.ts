import * as vscode from 'vscode';
import { config } from "./configuration";
import { afterFirstSepr, getUriMatchString, getWorkspaceSettingsForFile, getWorkspaceUriForFile, isFeatureFile, sepr, showTextDocumentRange, WkspError } from './common';
import { getStepFileSteps } from './fileParser';
import { parser } from './extension';
import { parseRepWildcard, StepFileStep } from "./stepsParser";
import { diagLog, DiagLogType } from './logger';


export function getStepMatch(featuresUri: vscode.Uri, stepType: string, stepText: string): StepFileStep | undefined {

  const findExactMatch = (stepText: string, stepType: string) => {
    const matchText = stepType + sepr + stepText;
    for (const [key, value] of exactSteps) {
      const rx = new RegExp(key, "i");
      const match = rx.exec(matchText);
      if (match && match.length !== 0) {
        return value;
      }
    }
  }

  const findParamsMatch = (stepText: string, stepType: string) => {
    const matchText = stepType + sepr + stepText;
    const matches = new Map<string, StepFileStep>();
    for (const [key, value] of paramsSteps) {
      const rx = new RegExp(key, "i");
      const match = rx.exec(matchText);
      if (match && match.length !== 0) {
        matches.set(key, value);
      }
    }
    return matches;
  }

  const findLongestParamsMatch = (paramsMatches: Map<string, StepFileStep>) => {
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


  // NOTE - this function needs to be FAST, hence the concat key for the map  
  const featuresUriMatchString = getUriMatchString(featuresUri);
  const allSteps = getStepFileSteps();
  // filter matches to the workspace that raised the click event using the fileUri in the key
  const wkspSteps = new Map([...allSteps].filter(([k,]) => k.startsWith(featuresUriMatchString)));
  // then remove the fileUri prefix from the keys
  const steps = new Map([...wkspSteps].map(([k, v]) => [afterFirstSepr(k), v]));

  const exactSteps = new Map([...steps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...steps].filter(([k,]) => k.includes(parseRepWildcard)));



  // any feature file step must map to a single python step function 
  // so this function should return the SINGLE best match


  let exactMatch = findExactMatch(stepText, stepType);
  if (!exactMatch && stepText !== "step")
    exactMatch = findExactMatch(stepText, "step");

  // got exact match - return it
  if (exactMatch)
    return exactMatch;

  // look for a parameters match, e.g. {something1} {something2}
  let paramsMatches = findParamsMatch(stepText, stepType);
  if (paramsMatches.size === 0 && stepText !== "step")
    paramsMatches = findParamsMatch(stepText, "step");

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

export async function waitOnParseComplete() {
  const ready = await parser.parseComplete(500, "checkReadyForStepsNavigation");
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

    if (!await waitOnParseComplete())
      return;

    const lineNo = activeEditor.selection.active.line;
    const line = activeEditor.document.lineAt(lineNo).text;
    const wkspSettings = getWorkspaceSettingsForFile(docUri);
    const content = activeEditor.document.getText();
    const typeAndText = getStepTypeAndText(content, line, lineNo);
    if (!typeAndText)
      return;

    const stepFileStep = getStepMatch(wkspSettings.featuresUri, typeAndText.stepType, typeAndText.text);

    if (!stepFileStep) {
      vscode.window.showInformationMessage(`Step '${line}' not found`)
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


export function getStepTypeAndText(content: string, line: string, lineNum: number) {
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

  const text = stExec[3].trim();
  return { stepType, text };
}
