import * as vscode from 'vscode';
import config from "./configuration";
import { getContentFromFilesystem } from './helpers';


const featureReStr = "^(\\s*|\\s*#\\s*)Feature:(\\s*)(.+)(\\s*)$";
const featureReLine = new RegExp(featureReStr);
const featureReFile = new RegExp(featureReStr, "im");
const scenarioReLine = /^(\s*)(Scenario|Scenario Outline):(\s*)(.+)(\s*)$/i;
const scenarioOutlineRe = /^(\s*)Scenario Outline:(\s*)(.+)(\s*)$/i;


export const getFeatureNameFromFile = async (uri: vscode.Uri): Promise<string | null> => {
  const content = await getContentFromFilesystem(uri);
  const featureName = featureReFile.exec(content);

  if (featureName === null)
    return null;

  return featureName[3];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureContent = (featureFilePath: string, featureName: string, text: string, caller: string,
  onScenarioLine: (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => void,
  onFeatureName: (range: vscode.Range) => void) => {

  const lines = text.split('\n');
  let fastSkipFeature = false;
  let fileScenarios = 0;

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#")) {
      continue;
    }

    const scenario = scenarioReLine.exec(line);
    if (scenario) {
      let fastSkipScenario = false;
      if (fastSkipFeature) {
        fastSkipScenario = true;
      }
      else {
        config.userSettings.fastSkipList.forEach(skipStr => {
          if (skipStr.startsWith("@") && lines[lineNo - 1].indexOf(skipStr) !== -1) {
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
      featureName = feature[3];

      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureName(range);

      if (lineNo > 0) {
        config.userSettings.fastSkipList.forEach(skipStr => {
          if (skipStr.startsWith("@") && lines[lineNo - 1].indexOf(skipStr) !== -1) {
            fastSkipFeature = true;
          }
        });
      }
    }
  }

  console.log(`${caller}: parsed ${fileScenarios} scenarios from ${featureFilePath}`);
};

