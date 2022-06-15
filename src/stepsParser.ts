import * as vscode from 'vscode';
import { getUriMatchString, isStepsFile, sepr } from './common';
import { getContentFromFilesystem } from './common';
import { getStepFileSteps } from './fileParser';
import { diagLog } from './logger';

export const parseRepWildcard = ".*";
const stepRe = /^\s*(@step|@given|@when|@then)\((?:u?"|')(.+)(?:"|').*\).*$/i;
const startRe = /^\s*(@step|@given|@when|@then).+/i;


export class StepFileStep {
  public funcLineNo = -1;
  constructor(
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly stepType: string,
    public readonly range: vscode.Range,
    public readonly textAsRe: string
  ) { }
}

export type StepFileStepMap = Map<string, StepFileStep>;

export const parseStepsFile = async (featuresUri: vscode.Uri, fileUri: vscode.Uri, caller: string, tempMap?: StepFileStepMap, start?: number, end?: number) => {

  if (!isStepsFile(fileUri))
    throw new Error(`${fileUri.path} is not a steps file`);

  const stepFileStepMap = getStepFileSteps();
  if (!tempMap) {
    // clear existing steps for this file uri
    const fileUriMatchString = getUriMatchString(fileUri);
    stepFileStepMap.forEach((stepFileStep, key, map) => {
      if (getUriMatchString(stepFileStep.uri) === fileUriMatchString)
        map.delete(key);
    });
  }

  const content = await getContentFromFilesystem(fileUri);
  if (!content)
    return;

  let fileSteps = 0;
  let setFuncLineKeys: string[] = [];
  let multiLineBuilding = false;
  let multiLine = "";
  let startLineNo = 0;
  let multiLineStepType = "";
  const lines = content.trim().split('\n');

  const startAt = tempMap && start ? start : 0;
  const endAt = tempMap && end ? end : lines.length;
  const map = tempMap ? tempMap : stepFileStepMap;

  for (let lineNo = startAt; lineNo < endAt; lineNo++) {

    let line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#"))
      continue;

    if (line.endsWith("\\"))
      line = line.slice(0, -1).trim();

    if (setFuncLineKeys.length > 0 && line.startsWith("def") || line.startsWith("async def")) {
      setFuncLineKeys.forEach(key => {
        const step = map.get(key);
        if (!step)
          throw `could not find step for key ${key}`;
        step.funcLineNo = lineNo;
      });
      setFuncLineKeys = [];
    }

    const foundStep = startRe.exec(line);
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


    const step = stepRe.exec(line);
    if (step) {
      const range = new vscode.Range(new vscode.Position(startLineNo, 0), new vscode.Position(lineNo, step[0].length));
      const stepFsRk = createStepFileStepAndReKey(featuresUri, fileUri, range, step);
      if (map.get(stepFsRk.reKey))
        diagLog("replacing duplicate step file step reKey: " + stepFsRk.reKey);
      map.set(stepFsRk.reKey, stepFsRk.stepFileStep); // map.set() = no duplicate keys allowed (per workspace)
      fileSteps++;
      setFuncLineKeys.push(stepFsRk.reKey);
    }

  }

  if (tempMap)
    return;

  diagLog(`${caller}: parsed ${fileSteps} steps from ${fileUri.path}`);
}


export function createStepFileStepAndReKey(featuresUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[1].slice(1);
  let textAsRe = step[2].trim();
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
  const fileName = fileUri.path.split("/").pop();
  if (!fileName)
    throw `no file name found in uri path ${fileUri.path}`;
  // note - it's important the key contains the featuresUri, NOT the fileUri, because we don't want to allow duplicate matches in the workspace
  const reKey = `${getUriMatchString(featuresUri)}${sepr}^${stepType}${sepr}${textAsRe}$`;
  const stepFileStep = new StepFileStep(fileUri, fileName, stepType, range, textAsRe);
  return { reKey, stepFileStep };
}

