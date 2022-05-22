import * as vscode from 'vscode';
import { isStepsFile } from './common';
import { getContentFromFilesystem } from './common';
import { diagLog } from './Logger';

//const stepRe = /^\s*(?:@step|@given|@when|@then)\((?:u?"|')(.+)("|').*\).*$/i;
const stepRe = /^\s*(?:@step|@given|@when|@then)\((?:u?"|')(.+)(?:"|').*\).*$/i;
const startRe = /^\s*(@step|@given|@when|@then).+/i;
export const parseRepWildcard = ".*";

export class StepDetail {
  constructor(public wkspFullFeaturesPath: string, public uri: vscode.Uri, public range: vscode.Range) { }
}

export type StepMap = Map<string, StepDetail>;

export const parseStepsFile = async (featuresUri: vscode.Uri, fileUri: vscode.Uri, steps: StepMap, caller: string) => {

  if (!isStepsFile(fileUri))
    throw new Error(`${fileUri.path} is not a steps file`);

  // user may have deleted a step, so clear the steps for this uri
  steps.forEach((value, key, map) => {
    if (value.uri.path === fileUri.path)
      map.delete(key);
  });

  let fileSteps = 0;

  const content = await getContentFromFilesystem(fileUri);
  if (!content)
    return;

  let multiLineBuilding = false;
  let multiLine = "";
  let startLine = 0;
  const lines = content.trim().split('\n');


  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    let line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#")) {
      continue;
    }

    if (line.endsWith("\\"))
      line = line.slice(0, -1).trim();


    const foundStep = startRe.exec(line);
    if (foundStep) {
      if (foundStep && line.endsWith("(")) {
        startLine = lineNo;
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
      line = "@step(" + multiLine + ")";
      multiLine = "";
    }
    else {
      startLine = lineNo;
    }


    const step = stepRe.exec(line);
    if (step) {
      let stepText = step[1].trim();
      stepText = stepText.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
      stepText = stepText.replace(/{.*?}/g, parseRepWildcard);
      const reKey = `${featuresUri.path}:^${stepText}$`;
      const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(lineNo, step[0].length));
      const detail = new StepDetail(featuresUri.path, fileUri, range);
      if (steps.get(reKey))
        diagLog("replacing duplicate step re: " + reKey);
      steps.set(reKey, detail); // there can be only one (per workspace)
      fileSteps++;
    }

  }

  diagLog(`${caller}: parsed ${fileSteps} steps from ${fileUri.path}`);

}
