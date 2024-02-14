import * as vscode from 'vscode';
import { getProjectUriForFile, sepr, uriId, urisMatch } from '../common/helpers';
import { xRayLog, LogType } from '../common/logger';
import { deleteStepFilesStepsForFile, getStepFilesSteps, parseRepWildcard, StepFileStep } from './stepsParser';
import { FeatureFileStep, deleteFeatureFilesStepsForFile, getFeatureFilesSteps } from './featureParser';
import { refreshStepReferencesView } from '../handlers/findStepReferencesHandler';
import { performance } from 'perf_hooks';
import { retriggerSemanticHighlighting } from '../handlers/semHighlightProvider';
import { services } from '../common/services';


let stepMappings: StepMapping[] = [];

export class StepMapping {
  constructor(
    // there is ONE stepFileStep to MANY featureFileSteps
    // but this is a flat table for performance
    public readonly projUri: vscode.Uri,
    public readonly stepFileStep: StepFileStep,
    public readonly featureFileStep: FeatureFileStep,
  ) {
  }
}


export function getStepFileStepForFeatureFileStep(featureFileUri: vscode.Uri, lineNo: number): StepFileStep | undefined {
  // note - lineNo is zero-based  
  const stepMappingForFeatureFileStep = stepMappings.find(sm =>
    sm.featureFileStep && urisMatch(sm.featureFileStep.uri, featureFileUri) && sm.featureFileStep.range.start.line === lineNo);
  return stepMappingForFeatureFileStep?.stepFileStep;
}


export function getStepMappingsForStepsFileFunction(stepsFileUri: vscode.Uri, lineNo: number): StepMapping[] {
  return stepMappings.filter(sm =>
    sm.stepFileStep && urisMatch(sm.stepFileStep.uri, stepsFileUri) &&
    sm.stepFileStep.functionDefinitionRange.start.line === lineNo);
}


export function getStepMappings(projUri: vscode.Uri): StepMapping[] {
  const projUriMatchString = uriId(projUri);
  return stepMappings.filter(sm => uriId(sm.projUri) === projUriMatchString);
}


export function deleteStepsAndStepMappingsForStepsFile(stepsFileUri: vscode.Uri) {
  const stepsFileUriMatchString = uriId(stepsFileUri);
  stepMappings = stepMappings.filter(sm => uriId(sm.stepFileStep.uri) !== stepsFileUriMatchString);
  deleteStepFilesStepsForFile(stepsFileUri);
}


export function deleteStepsAndStepMappingsForFeatureFile(featureFileUri: vscode.Uri) {
  const featureFileUriMatchString = uriId(featureFileUri);
  stepMappings = stepMappings.filter(sm => uriId(sm.featureFileStep.uri) !== featureFileUriMatchString);
  deleteFeatureFilesStepsForFile(featureFileUri);
}


export function clearStepMappings(projUri: vscode.Uri) {
  // NOTE: this just deletes the mappings, it does NOT delete stepFileSteps or featureFileSteps.
  // (for efficiency, the deletion functions deleteStepFileSteps and deleteFeatureFilesSteps are only called 
  // when needed from _parseStepsFiles and _parseFeatureFiles respectively)
  stepMappings = stepMappings.filter(sm => !urisMatch(sm.projUri, projUri));
}


export async function waitOnReadyForStepsNavigation(waitMs: number) {
  return await services.parser.stepsParseComplete(waitMs, "waitOnReadyForStepsNavigation");
}

export function rebuildStepMappings(projUri: vscode.Uri): number {

  const start = performance.now();
  clearStepMappings(projUri);

  // get filtered objects before we loop
  const { featureFileSteps, exactSteps, paramsSteps } = _getFilteredSteps(projUri);

  let processed = 0;
  for (const [, featureFileStep] of featureFileSteps) {
    const stepFileStep = _getStepFileStepMatch(featureFileStep, exactSteps, paramsSteps);
    if (stepFileStep)
      stepMappings.push(new StepMapping(projUri, stepFileStep, featureFileStep));
    processed++;
  }

  retriggerSemanticHighlighting();
  refreshStepReferencesView();

  xRayLog(`rebuilding step mappings for ${projUri.path} took ${performance.now() - start} ms`);

  return processed;
}


function _getFilteredSteps(projUri: vscode.Uri) {
  const featureFileSteps = getFeatureFilesSteps(projUri);
  const projStepFileSteps = getStepFilesSteps(projUri);
  const exactSteps = new Map(projStepFileSteps.filter(([k,]) => !k.includes(parseRepWildcard)));
  const paramsSteps = new Map(projStepFileSteps.filter(([k,]) => k.includes(parseRepWildcard)));
  return { featureFileSteps, exactSteps, paramsSteps };
}


// any feature file step MUST map to a single python step function (or none)
// so this function should return the SINGLE best match
function _getStepFileStepMatch(featureFileStep: FeatureFileStep,
  exactSteps: Map<string, StepFileStep>, paramsSteps: Map<string, StepFileStep>): StepFileStep | null {

  const findExactMatch = (textWithoutType: string, stepType: string) => {
    const matchText = stepType + sepr + textWithoutType;
    for (const [key, value] of exactSteps) {
      const rx = new RegExp(key, "i");
      const match = rx.exec(matchText);
      if (match && match.length !== 0) {
        return value;
      }
    }
  }

  const findParamsMatch = (textWithoutType: string, stepType: string) => {
    const matchText = stepType + sepr + textWithoutType;
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

  let textWithoutType = featureFileStep.textWithoutType;
  if (textWithoutType.endsWith(":")) // behave will match e.g. "Given some table:" to "Given some table"
    textWithoutType = textWithoutType.slice(0, -1);

  let exactMatch = findExactMatch(textWithoutType, featureFileStep.stepType);
  if (!exactMatch && featureFileStep.stepType !== "step")
    exactMatch = findExactMatch(textWithoutType, "step");

  // got exact match - return it
  if (exactMatch)
    return exactMatch;

  // look for a parameters match, e.g. {something1} {something2}
  let paramsMatches = findParamsMatch(textWithoutType, featureFileStep.stepType);
  if (paramsMatches.size === 0 && featureFileStep.stepType !== "step")
    paramsMatches = findParamsMatch(textWithoutType, "step");

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
