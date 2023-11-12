import * as vscode from 'vscode';
import { uriId, isStepsFile, sepr, basename, afterFirstSepr, getLines } from '../common';
import { diagLog } from '../logger';

export const parseRepWildcard = ".*";
export const funcRe = /^(async )?def/;
const stepFileStepStartStr = "^\\s*@(behave\\.)?(step|given|when|then)\\(";
const stepFileStepStartRe = new RegExp(`${stepFileStepStartStr}.*`, "i");
const stepFileStepRe = new RegExp(`${stepFileStepStartStr}u?(?:"|')(.+)(?:"|').*\\).*$`, "i");
const stepFileSteps = new Map<string, StepFileStep>();

export class StepFileStep {
  public functionDefinitionRange: vscode.Range = new vscode.Range(0, 0, 0, 0);
  constructor(
    public readonly key: string,
    public readonly uri: vscode.Uri,
    public readonly fileName: string,
    public readonly stepType: string,
    public readonly stepTextRange: vscode.Range,
    public readonly textAsRe: string
  ) { }
}


export function getStepFilesSteps(projUri: vscode.Uri, removeFileUriPrefix = true): [string, StepFileStep][] {
  const projUriMatchString = uriId(projUri);
  let steps = [...stepFileSteps].filter(([k,]) => k.startsWith(projUriMatchString));

  // return with keys as they are
  if (!removeFileUriPrefix)
    return steps;

  // remove the project uri from the key so the key can be used for string matching (i.e. in _getStepFileStepMatch)
  steps = [...new Map([...steps].map(([k, v]) => [afterFirstSepr(k), v]))];
  return steps;
}


export function deleteStepFileSteps(projUri: vscode.Uri) {
  const projStepFileSteps = getStepFilesSteps(projUri, false);
  for (const [key,] of projStepFileSteps) {
    stepFileSteps.delete(key);
  }
}


export async function parseStepsFileContent(projUri: vscode.Uri, content: string, stepFileUri: vscode.Uri, caller: string) {

  if (!isStepsFile(stepFileUri))
    throw new Error(`${stepFileUri.path} is not a steps file`);

  if (!content)
    return;

  const fileUriMatchString = uriId(stepFileUri);

  // clear all existing stepFileSteps for this step file uri
  for (const [key, stepFileStep] of stepFileSteps) {
    if (uriId(stepFileStep.uri) === fileUriMatchString)
      stepFileSteps.delete(key);
  }

  let fileSteps = 0;
  let setFuncLineKeys: string[] = [];
  let multiLineBuilding = false;
  let multiLine = "";
  let startLineNo = 0;
  let multiLineStepType = "";
  const lines = getLines(content);

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
        step.functionDefinitionRange = new vscode.Range(lineNo, 0, lineNo, line.length);
      });
      setFuncLineKeys = [];
    }

    const foundStep = stepFileStepStartRe.exec(line);
    if (foundStep) {
      if (foundStep && line.endsWith("(")) {
        startLineNo = lineNo;
        multiLineStepType = foundStep[2];
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
      line = `@${multiLineStepType}(${multiLine})`;
      multiLine = "";
    }
    else {
      startLineNo = lineNo;
    }


    const step = stepFileStepRe.exec(line);
    if (step) {
      const range = new vscode.Range(new vscode.Position(startLineNo, 0), new vscode.Position(lineNo, step[0].length));
      const stepFsRk = createStepFileStepAndReKey(projUri, stepFileUri, range, step);
      if (stepFileSteps.get(stepFsRk.reKey))
        diagLog("replacing duplicate step file step reKey: " + stepFsRk.reKey);
      stepFileSteps.set(stepFsRk.reKey, stepFsRk.stepFileStep); // map.set() = no duplicate keys allowed (per workspace)
      fileSteps++;
      setFuncLineKeys.push(stepFsRk.reKey);
    }

  }

  diagLog(`${caller}: parsed ${fileSteps} steps from ${stepFileUri.path}`);
}


function createStepFileStepAndReKey(projUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[2];
  let textAsRe = step[3].trim();
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
  const fileName = basename(fileUri);
  // NOTE: it's important the key contains the projUri, NOT the fileUri, because we 
  // don't want to allow duplicate text matches in the project
  const reKey = `${uriId(projUri)}${sepr}^${stepType}${sepr}${textAsRe}$`;
  const stepFileStep = new StepFileStep(reKey, fileUri, fileName, stepType, range, textAsRe);
  return { reKey, stepFileStep };
}
