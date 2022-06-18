import * as vscode from 'vscode';
import { afterFirstSepr, getUriMatchString, sepr, urisMatch } from './common';
import { parser } from './extension';
import { diagLog, DiagLogType } from './logger';
import { getStepFileSteps, parseRepWildcard, StepFileStep } from './stepsParser';
import { FeatureFileStep, getFeatureFileSteps } from './featureParser';


let stepMappings: StepMapping[] = [];
export const getStepMappings = () => stepMappings;

export class StepMapping {
  constructor(
    // there is ONE stepFileStep to MANY featureFileSteps
    // but this is a flat table for performance
    public readonly featuresUri: vscode.Uri,
    public readonly stepFileStep: StepFileStep,
    public readonly featureFileStep: FeatureFileStep,
  ) {
  }
}


export function getStepMappingForFeatureFileLine(featureFileUri: vscode.Uri, lineNo: number): StepFileStep | null {
  const stepMappingForFeatureFileStep = stepMappings.find(sm =>
    sm.featureFileStep && urisMatch(sm.featureFileStep.uri, featureFileUri) && sm.featureFileStep.range.start.line === lineNo);
  return stepMappingForFeatureFileStep ? stepMappingForFeatureFileStep.stepFileStep : null;
}


export function getStepMappingsForStepsFileLine(stepsFileUri: vscode.Uri, lineNo: number): StepMapping[] {
  return stepMappings.filter(sm =>
    sm.stepFileStep && urisMatch(sm.stepFileStep.uri, stepsFileUri) &&
    sm.stepFileStep.funcLineNo === lineNo);
}


// export function deleteStepMappingsForFeatureFile(featureFileUri: vscode.Uri) {
//   const featureFileUriMatchString = getUriMatchString(featureFileUri);
//   for (const stepMapping of stepMappings) {
//     if (getUriMatchString(stepMapping.featureFileStep.uri).startsWith(featureFileUriMatchString))
//       stepMappings.slice(stepMappings.indexOf(stepMapping), 1);
//   }
// }


export function deleteStepMappings(featuresUri: vscode.Uri) {
  stepMappings = stepMappings.filter(sm => !urisMatch(sm.featuresUri, featuresUri));
}


export async function waitOnReadyForStepsNavigation() {
  const ready = await parser.stepsParseComplete(500, "waitOnReadyForStepsNavigation");
  if (!ready) {
    const msg = "Cannot navigate steps while step files are being parsed, please try again.";
    diagLog(msg, undefined, DiagLogType.warn);
    vscode.window.showWarningMessage(msg);
    return false;
  }
  if (!hasStepMappings)
    await new Promise(t => setTimeout(t, 100));
  return hasStepMappings;
}


let hasStepMappings = false;
let stopBuilding = false;
export async function buildStepMappings(featuresUri: vscode.Uri, cancelToken: vscode.CancellationToken) {
  hasStepMappings = false;
  stopBuilding = false;

  cancelToken.onCancellationRequested(() => {
    stopBuilding = true; // don't use isCancellationRequested due to immediate disposal in startWatchingWorkspace.updater
  });

  deleteStepMappings(featuresUri);

  getFeatureFileSteps().forEach(featureFileStep => {
    if (stopBuilding)
      return;
    const stepFileStep = _getStepFileStepMatch(featuresUri, featureFileStep);
    if (stepFileStep)
      stepMappings.push(new StepMapping(featuresUri, stepFileStep, featureFileStep));
  });

  hasStepMappings = true;
}


// any feature file step must map to a single python step function 
// so this function should return the SINGLE best match
function _getStepFileStepMatch(featuresUri: vscode.Uri, featureFileStep: FeatureFileStep): StepFileStep | null {

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

  const findLongestParamsMatch = (paramsMatches: Map<string, StepFileStep>): StepFileStep => {
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


  // NOTE - THIS FUNCTION NEEDS TO BE FAST (hence the concat key for the map)
  const featuresUriMatchString = getUriMatchString(featuresUri);
  const allSteps = getStepFileSteps();
  // filter matches to the workspace that raised the click event using the fileUri in the key
  const wkspSteps = new Map([...allSteps].filter(([k,]) => k.startsWith(featuresUriMatchString)));
  // then remove the fileUri prefix from the keys
  const steps = new Map([...wkspSteps].map(([k, v]) => [afterFirstSepr(k), v]));

  const exactSteps = new Map([...steps].filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map([...steps].filter(([k,]) => k.includes(parseRepWildcard)));

  let exactMatch = findExactMatch(featureFileStep.text, featureFileStep.stepType);
  if (!exactMatch && featureFileStep.stepType !== "step")
    exactMatch = findExactMatch(featureFileStep.text, "step");

  // got exact match - return it
  if (exactMatch)
    return exactMatch;

  // look for a parameters match, e.g. {something1} {something2}
  let paramsMatches = findParamsMatch(featureFileStep.text, featureFileStep.stepType);
  if (paramsMatches.size === 0 && featureFileStep.stepType !== "step")
    paramsMatches = findParamsMatch(featureFileStep.text, "step");

  // got single parameters match - return it
  if (paramsMatches.size === 1)
    return paramsMatches.values().next().value;

  // more than one parameters match - get longest matched key      
  if (paramsMatches.size > 1) {
    return findLongestParamsMatch(paramsMatches);
  }

  // no matching step
  return null;
}
