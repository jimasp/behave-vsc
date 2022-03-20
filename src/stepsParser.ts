import * as vscode from 'vscode';
import { getContentFromFilesystem } from './helpers';

const stepRe = /^(\s*)(@given|@when|@then|@and|@but)\((.?)("|')(.+)("|')\)(\s*)$/i;

export class StepDetail {
  constructor(public uri: vscode.Uri, public range: vscode.Range) { }
}

export type Steps = Map<string, StepDetail>;


export const parseStepsFile = async (uri: vscode.Uri, steps: Steps) => {

  if (uri.scheme !== "file")
    return;

  const content = await getContentFromFilesystem(uri);
  if (!content)
    return;

  steps.forEach((value, key, map) => {
    if (value.uri.path === uri.path)
      map.delete(key);
  });

  const lines = content.trim().split('\n');

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo].trim();

    if (line === '' || line.startsWith("#")) {
      continue;
    }

    const step = stepRe.exec(line);
    if (step) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, step[0].length));
      let stepText = step[5].trim();
      stepText = stepText.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
      stepText = stepText.replace(/{.*?}/g, '.+');
      const reKey = `^${stepText}$`;
      const detail = new StepDetail(uri, range);
      steps.set(reKey, detail); // there can be only one
    }
  }

};

