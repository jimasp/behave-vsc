import * as vscode from 'vscode';
import { WorkspaceSettings } from "./settings";
import { getContentFromFilesystem } from './common';
import { diagLog } from './logger';
import { getFeatureSteps } from './fileParser';


const featureReStr = "^(\\s*)Feature:(\\s*)(.+)(\\s*)$";
const featureReLine = new RegExp(featureReStr);
const featureReFile = new RegExp(featureReStr, "im");
const scenarioReLine = /^(\s*)(Scenario|Scenario Outline):(\s*)(.+)(\s*)$/i;
const scenarioOutlineRe = /^(\s*)Scenario Outline:(\s*)(.+)(\s*)$/i;
const featureStepRe = /^\s*(Given |When |Then |And )(.+)/i;

export class StepReferenceDetail {
  constructor(public readonly fileName: string, public readonly uri: vscode.Uri, public readonly range: vscode.Range, public readonly content: string) { }
}

export class KeyedStepReferenceDetail {
  constructor(public readonly key: string, public readonly feature: StepReferenceDetail) { }
}

export type FeatureSteps = KeyedStepReferenceDetail[];


export const getFeatureNameFromFile = async (uri: vscode.Uri): Promise<string | null> => {
  const content = await getContentFromFilesystem(uri);
  const featureName = featureReFile.exec(content);

  if (featureName === null)
    return null;

  return featureName[3];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureContent = (wkspSettings: WorkspaceSettings, fileUri: vscode.Uri, featureName: string, text: string, caller: string,
  onScenarioLine: (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => void,
  onFeatureLine: (range: vscode.Range) => void) => {

  const lines = text.split('\n');
  let fastSkipFeature = false;
  let fileScenarios = 0;
  let fileSteps = 0;
  const featureSteps = getFeatureSteps();

  // clear existing steps for this file uri  
  for (let i = featureSteps.length - 1; i >= 0; i--) {
    if (featureSteps[i].feature.uri === fileUri)
      featureSteps.splice(i, 1);
  }

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
      const key = `${wkspSettings.featuresUri.path}:${stepText}`;
      const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
      const fileName = fileUri.path.split("/").pop();
      if (!fileName)
        throw `no file name found in uri path ${fileUri.path}`;
      const refDetail = new StepReferenceDetail(fileName, fileUri, range, line);
      featureSteps.push(new KeyedStepReferenceDetail(key, refDetail)); // duplicate keys expected (one step can be reused across many feature files)
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

      const scenarioName = scenario[4];
      const isOutline = scenarioOutlineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, featureName, scenarioName, isOutline, fastSkipScenario);
      fileScenarios++;
      continue;
    }

    const feature = featureReLine.exec(line);
    if (feature) {
      //featureName = feature[3];

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

  diagLog(`${caller}: parsed ${fileScenarios} scenarios and ${fileSteps} steps from ${fileUri.path}`, wkspSettings.uri);
};
