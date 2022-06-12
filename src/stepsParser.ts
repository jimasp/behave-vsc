import * as vscode from 'vscode';
import { getUriMatchString, isStepsFile, sepr } from './common';
import { getContentFromFilesystem } from './common';
import { getSteps } from './fileParser';
import { diagLog } from './logger';

export const parseRepWildcard = ".*";
const stepRe = /^\s*(@step|@given|@when|@then)\((?:u?"|')(.+)(?:"|').*\).*$/i;
const startRe = /^\s*(@step|@given|@when|@then).+/i;


export class StepDetail {
  constructor(public uri: vscode.Uri, public range: vscode.Range) { }
}

export type StepMap = Map<string, StepDetail>;

export const parseStepsFile = async (featuresUri: vscode.Uri, fileUri: vscode.Uri, caller: string, tempMap?: StepMap, start?: number, end?: number) => {

  if (!isStepsFile(fileUri))
    throw new Error(`${fileUri.path} is not a steps file`);

  const stepMap = getSteps();
  if (!tempMap) {
    // clear existing steps for this file uri
    const fileUriMatchString = getUriMatchString(fileUri);
    stepMap.forEach((value, key, map) => {
      if (getUriMatchString(value.uri) === fileUriMatchString)
        map.delete(key);
    });
  }

  const content = await getContentFromFilesystem(fileUri);
  if (!content)
    return;

  let fileSteps = 0;
  let multiLineBuilding = false;
  let multiLine = "";
  let startLineNo = 0;
  let multiLineStepType = "";
  const lines = content.trim().split('\n');

  const startAt = tempMap && start ? start : 0;
  const endAt = tempMap && end ? end : lines.length;
  const map = tempMap ? tempMap : stepMap;

  for (let lineNo = startAt; lineNo < endAt; lineNo++) {

    let line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#")) {
      continue;
    }

    if (line.endsWith("\\"))
      line = line.slice(0, -1).trim();


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
      const reKey = getStepKey(step, featuresUri);
      const range = new vscode.Range(new vscode.Position(startLineNo, 0), new vscode.Position(lineNo, step[0].length));
      const detail = new StepDetail(fileUri, range);
      if (map.get(reKey))
        diagLog("replacing duplicate step file step reKey: " + reKey);
      map.set(reKey, detail); // there can be only one (per workspace)
      fileSteps++;
    }

  }

  if (tempMap)
    return;

  diagLog(`${caller}: parsed ${fileSteps} steps from ${fileUri.path}`);
}

export function getStepKey(step: RegExpExecArray, featuresUri: vscode.Uri) {
  const stepType = step[1].slice(1);
  let stepText = step[2].trim();
  stepText = stepText.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  stepText = stepText.replace(/{.*?}/g, parseRepWildcard);
  return `${featuresUri.path}${sepr}^${stepType}${sepr}${stepText}$`;
}

