import * as vscode from 'vscode';
import { uriMatchString, isStepsFile, sepr } from './common';
import { getContentFromFilesystem } from './common';
import { diagLog } from './logger';

export const parseRepWildcard = ".*";
export const funcRe = /^(async )?def/;
const stepFileStepStartRe = /^\s*(@step|@given|@when|@then).+/i;
const stepFileStepRe = /^\s*(@step|@given|@when|@then)\((?:u?"|')(.+)(?:"|').*\).*$/i;

const stepFileSteps = new Map<string, StepFileStep>();
export const getStepFileSteps = () => stepFileSteps;


export class StepFileStep {
  public funcLineNo = -1;
  constructor(
    public readonly key: string,
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly stepType: string,
    public readonly range: vscode.Range,
    public readonly textAsRe: string
  ) { }
}



export const parseStepsFile = async (featuresUri: vscode.Uri, stepFileUri: vscode.Uri, caller: string) => {

  if (!isStepsFile(stepFileUri))
    throw new Error(`${stepFileUri.path} is not a steps file`);

  const content = await getContentFromFilesystem(stepFileUri);
  if (!content)
    return;

  const fileUriMatchString = uriMatchString(stepFileUri);

  // clear all existing stepFileSteps for this step file uri
  for (const [key, stepFileStep] of stepFileSteps) {
    if (uriMatchString(stepFileStep.uri) === fileUriMatchString)
      stepFileSteps.delete(key);
  }

  let fileSteps = 0;
  let setFuncLineKeys: string[] = [];
  let multiLineBuilding = false;
  let multiLine = "";
  let startLineNo = 0;
  let multiLineStepType = "";
  const lines = content.trim().split('\n');

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    let line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#"))
      continue;

    if (line.endsWith("\\"))
      line = line.slice(0, -1).trim();

    if (setFuncLineKeys.length > 0 && funcRe.test(line)) {
      setFuncLineKeys.forEach(key => {
        const step = stepFileSteps.get(key);
        if (!step)
          throw `could not find step for key ${key}`;
        step.funcLineNo = lineNo;
      });
      setFuncLineKeys = [];
    }

    const foundStep = stepFileStepStartRe.exec(line);
    if (foundStep) {
      if (foundStep && line.endsWith("(")) {
        startLineNo = lineNo;
        multiLineStepType = foundStep[1];
        multiLineBuilding = true;
        continue;
      }
    }

    if (multiLineBuilding) {
      if (line.startsWith(")")) {
        multiLine = multiLine.replaceAll("''", "");
        multiLine = multiLine.replaceAll('""', "");
        multiLineBuilding = false;
      }
      else {
        multiLine += line;
        continue;
      }
    }


    if (multiLine) {
      line = `${multiLineStepType}(${multiLine})`;
      multiLine = "";
    }
    else {
      startLineNo = lineNo;
    }


    const step = stepFileStepRe.exec(line);
    if (step) {
      const range = new vscode.Range(new vscode.Position(startLineNo, 0), new vscode.Position(lineNo, step[0].length));
      const stepFsRk = createStepFileStepAndReKey(featuresUri, stepFileUri, range, step);
      if (stepFileSteps.get(stepFsRk.reKey))
        diagLog("replacing duplicate step file step reKey: " + stepFsRk.reKey);
      stepFileSteps.set(stepFsRk.reKey, stepFsRk.stepFileStep); // map.set() = no duplicate keys allowed (per workspace)
      fileSteps++;
      setFuncLineKeys.push(stepFsRk.reKey);
    }

  }

  diagLog(`${caller}: parsed ${fileSteps} steps from ${stepFileUri.path}`);
}


export function createStepFileStepAndReKey(featuresUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[1].slice(1);
  let textAsRe = step[2].trim();
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
  const fileName = fileUri.path.split("/").pop();
  if (!fileName)
    throw `no file name found in uri path ${fileUri.path}`;
  // NOTE: it's important the key contains the featuresUri, NOT the fileUri, because we don't want to allow duplicate matches in the workspace
  const reKey = `${uriMatchString(featuresUri)}${sepr}^${stepType}${sepr}${textAsRe}$`;
  const stepFileStep = new StepFileStep(reKey, fileUri, fileName, stepType, range, textAsRe);
  return { reKey, stepFileStep };
}

