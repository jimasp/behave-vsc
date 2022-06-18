import * as vscode from 'vscode';
import { WorkspaceSettings } from "./settings";
import { getContentFromFilesystem, getUriMatchString, sepr } from './common';
import { diagLog } from './logger';


const featureReStr = "^(\\s*)Feature:(\\s*)(.+)(\\s*)$";
const featureReLine = new RegExp(featureReStr);
const featureReFile = new RegExp(featureReStr, "im");
const scenarioReLine = /^(\s*)(Scenario|Scenario Outline):(\s*)(.+)(\s*)$/i;
const scenarioOutlineRe = /^(\s*)Scenario Outline:(\s*)(.+)(\s*)$/i;
export const featureStepRe = /^\s*(Given |When |Then |And |But )(.+)/i;

const featureFileSteps = new Map<string, FeatureFileStep>();
export const getFeatureFileSteps = () => featureFileSteps;

export class FeatureFileStep {
  constructor(
    public readonly key: string,
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly stepType: string,
    public readonly range: vscode.Range,
    public readonly text: string,
  ) { }
}



export const getFeatureNameFromFile = async (uri: vscode.Uri): Promise<string | null> => {
  const content = await getContentFromFilesystem(uri);
  const featureName = featureReFile.exec(content);

  if (featureName === null)
    return null;

  return featureName[3];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureContent = (wkspSettings: WorkspaceSettings, uri: vscode.Uri, featureName: string, content: string, caller: string,
  onScenarioLine: (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => void,
  onFeatureLine: (range: vscode.Range) => void) => {

  const lines = content.split('\n');
  let fastSkipFeature = false;
  let fileScenarios = 0;
  let fileSteps = 0;
  let lastStepType = "given";

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    // get indent before we trim
    const indent = lines[lineNo].match(/^\s*/);
    const indentSize = indent && indent[0] ? indent[0].length : 0;

    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith("#")) {
      continue;
    }

    const step = featureStepRe.exec(line);
    if (step) {
      const stepText = step[2].trim();

      let stepType = step[1].trim().toLowerCase();
      if (stepType === "and" || stepType === "but")
        stepType = lastStepType;
      else
        lastStepType = stepType;

      const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
      const key = `${getUriMatchString(uri)}${sepr}${range.start.line}`;
      featureFileSteps.set(key, new FeatureFileStep(key, uri, featureName, stepType, range, stepText));
      fileSteps++;
      continue;
    }

    const scenario = scenarioReLine.exec(line);
    if (scenario) {
      let fastSkipScenario = false;
      if (fastSkipFeature) {
        fastSkipScenario = true;
      }
      else {
        wkspSettings.fastSkipTags.forEach(skipStr => {
          if (skipStr.startsWith("@") && lines[lineNo - 1].includes(skipStr)) {
            fastSkipScenario = true;
          }
        });
      }

      const scenarioName = scenario[4].trim();
      const isOutline = scenarioOutlineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, featureName, scenarioName, isOutline, fastSkipScenario);
      fileScenarios++;
      continue;
    }

    const feature = featureReLine.exec(line);
    if (feature) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureLine(range);

      if (lineNo > 0) {
        wkspSettings.fastSkipTags.forEach(skipStr => {
          if (skipStr.startsWith("@") && lines[lineNo - 1].includes(skipStr)) {
            fastSkipFeature = true;
          }
        });
      }
    }

  }

  diagLog(`${caller}: parsed ${fileScenarios} scenarios and ${fileSteps} steps from ${uri.path}`, wkspSettings.uri);
};



