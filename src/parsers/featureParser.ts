import * as vscode from 'vscode';
import { WorkspaceSettings } from "../common/settings";
import { uriId, sepr, basename, getLines } from '../common/helpers';
import { diagLog } from '../common/logger';


const featureReStr = /^(\s*)Feature:(\s*)(.+)$/;
const featureLineRe = new RegExp(featureReStr);
const featureReFile = new RegExp(featureReStr, "im");
const scenarioLineRe = /^(\s*)(Scenario|Scenario Outline):(.+)$/i;
const scenarioOutlineLineRe = /^(\s*)Scenario Outline:(.+)$/i;
const examplesLineRe = /^(\s*)Examples:(.+)$/i;
export const featureFileStepRe = /^\s*(Given |When |Then |And |But )(.*)/i;

const featureFileSteps = new Map<string, FeatureFileStep>();

export class FeatureFileStep {
  constructor(
    public readonly key: string,
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly range: vscode.Range,
    public readonly text: string,
    public readonly textWithoutType: string,
    public readonly stepType: string,
  ) { }
}

export const getFeatureFileSteps = (featuresUri: vscode.Uri) => {
  const featuresUriMatchString = uriId(featuresUri);
  return [...featureFileSteps].filter(([k,]) => k.startsWith(featuresUriMatchString));
}

export const deleteFeatureFileSteps = (featuresUri: vscode.Uri) => {
  const wkspFeatureFileSteps = getFeatureFileSteps(featuresUri);
  for (const [key,] of wkspFeatureFileSteps) {
    featureFileSteps.delete(key);
  }
}

export const getFeatureNameFromContent = async (content: string): Promise<string | null> => {
  const featureName = featureReFile.exec(content);

  if (featureName === null)
    return null;

  return featureName[3].trim();
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureContent = (wkspSettings: WorkspaceSettings, uri: vscode.Uri, content: string, caller: string,
  onScenarioLine: (range: vscode.Range, scenarioName: string, isOutline: boolean) => void,
  onFeatureLine: (range: vscode.Range) => void,
  onExamplesLine: (range: vscode.Range, examplesLine: string) => void,
  onExampleLine: (range: vscode.Range, exampleRow: string) => void) => {

  const fileName = basename(uri);
  const lines = getLines(content);
  let examples = false;
  let fileScenarios = 0;
  let fileSteps = 0;
  let lastStepType = "given";

  const fileUriMatchString = uriId(uri);

  // clear all existing featureFileSteps for this step file uri
  for (const [key, featureFileStep] of featureFileSteps) {
    if (uriId(featureFileStep.uri) === fileUriMatchString)
      featureFileSteps.delete(key);
  }


  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    // get indent before we trim
    const indent = lines[lineNo].match(/^\s*/);
    const indentSize = indent && indent[0] ? indent[0].length : 0;

    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith("#")) {
      continue;
    }

    const step = featureFileStepRe.exec(line);
    if (step) {
      const text = step[0].trim();
      const matchText = step[2].trim();

      let stepType = step[1].trim().toLowerCase();
      if (stepType === "and" || stepType === "but")
        stepType = lastStepType;
      else
        lastStepType = stepType;

      const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
      const key = `${uriId(uri)}${sepr}${range.start.line}`;
      featureFileSteps.set(key, new FeatureFileStep(key, uri, fileName, range, text, matchText, stepType));
      fileSteps++;
      continue;
    }

    const scenario = scenarioLineRe.exec(line);
    if (scenario) {
      const scenarioName = scenario[3].trim();
      const isOutline = scenarioOutlineLineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, scenarioName, isOutline);
      fileScenarios++;
      continue;
    }

    const feature = featureLineRe.test(line);
    if (feature) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureLine(range);
      continue;
    }

    if (examples && line.startsWith("|") && line.endsWith("|")) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onExampleLine(range, line);
    }
    else {
      examples = false;
    }

    const example = examplesLineRe.test(line);
    if (example) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onExamplesLine(range, line);
      examples = true;
      continue;
    }

  }

  diagLog(`${caller}: parsed ${fileScenarios} scenarios and ${fileSteps} steps from ${uri.path}`, wkspSettings.uri);
};



