import * as vscode from 'vscode';
import { ProjectSettings } from "../settings";
import { uriId, sepr, basename, getLines, getWorkspaceUriForFile } from '../common';
import { diagLog } from '../logger';
import { config } from '../configuration';


const featureRe = /^\s*Feature:(.*)$/i;
const featureMultiLineRe = /^\s*Feature:(.*)$/im;
const commentedFeatureMultilineReStr = /^\s*#.*Feature:(.*)$/im;
const scenarioRe = /^\s*(Scenario|Scenario Outline):(.*)$/i;
const scenarioOutlineRe = /^\s*Scenario Outline:(.*)$/i;
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

export const getFeatureFilesSteps = (wkspFolderUri: vscode.Uri) => {
  const wkspFolderUriMatchString = uriId(wkspFolderUri);
  return [...featureFileSteps].filter(([k,]) => k.startsWith(wkspFolderUriMatchString));
}

export const deleteFeatureFilesSteps = (wkspFolderUri: vscode.Uri) => {
  const projFeatureFileSteps = getFeatureFilesSteps(wkspFolderUri);
  for (const [key,] of projFeatureFileSteps) {
    featureFileSteps.delete(key);
  }
}

export const getFeatureNameFromContent = async (content: string, uri: vscode.Uri, firstRun: boolean): Promise<string | null> => {
  const featureText = featureMultiLineRe.exec(content);

  if (featureText === null) {
    if (commentedFeatureMultilineReStr.exec(content) !== null)
      return null; // # Feature: (commented out) - ignore
    return null; // no "Feature:" text exists in file - ignore (user may be typing it out live, or could be an empty file)
  }

  const featureName = featureText[1].trim();
  if (featureName === '') {
    if (firstRun) {
      config.logger.showWarn(`No feature name found in file: ${uri.fsPath}. This feature will be ignored until it has a name.`,
        getWorkspaceUriForFile(uri));
    }
    return null;
  }

  return featureName;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureContent = (wkspSettings: ProjectSettings, uri: vscode.Uri, content: string, caller: string,
  onScenarioLine: (range: vscode.Range, scenarioName: string, isOutline: boolean) => void,
  onFeatureLine: (range: vscode.Range) => void) => {

  const fileName = basename(uri);
  const lines = getLines(content);
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

      let lcStepType = step[1].trim().toLowerCase();
      if (lcStepType === "and" || lcStepType === "but")
        lcStepType = lastStepType;
      else
        lastStepType = lcStepType;

      const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
      const key = `${uriId(uri)}${sepr}${range.start.line}`;
      featureFileSteps.set(key, new FeatureFileStep(key, uri, fileName, range, text, matchText, lcStepType));
      fileSteps++;
      continue;
    }

    const scenario = scenarioRe.exec(line);
    if (scenario) {
      const scenarioName = scenario[2].trim();
      const isOutline = scenarioOutlineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, scenarioName, isOutline);
      fileScenarios++;
      continue;
    }

    const feature = featureRe.exec(line);
    if (feature) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureLine(range);
    }

  }

  diagLog(`${caller}: parsed ${fileScenarios} scenarios and ${fileSteps} steps from ${uri.path}`, wkspSettings.uri);
};



