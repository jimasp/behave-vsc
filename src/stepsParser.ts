import * as vscode from 'vscode';
import { getContentFromFilesystem } from './helpers';

const stepRe = /^\s*(?:@step|@given|@when|@then)\((?:"|')(.+)("|').*\).*$/i;
const startRe = /^\s*(@step|@given|@when|@then).+/i;

export class StepDetail {
  constructor(public uri: vscode.Uri, public range: vscode.Range) { }
}

export type Steps = Map<string, StepDetail>;

export const parseStepsFile = async (uri: vscode.Uri, steps: Steps) => {

  if (uri.scheme !== "file" || !uri.path.toLowerCase().endsWith(".py"))
    throw new Error(`${uri.path} is not a python file`);

  steps.forEach((value, key, map) => {
    if (value.uri.path === uri.path)
      map.delete(key);
  });

  const content = await getContentFromFilesystem(uri);
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
      line.slice(0, -1);


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
      stepText = stepText.replace(/{.*?}/g, '.+');
      const reKey = `^${stepText}$`;
      const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(lineNo, step[0].length));
      const detail = new StepDetail(uri, range);
      steps.set(reKey, detail); // there can be only one
    }

  }

};
