import * as vscode from 'vscode';

const stepRe = /^(\s*)(@given|@when|@then|@and)\(("|')(.+)("|')\)(\s*)$/i;

export class StepDetail {
    constructor(public uri: vscode.Uri, public range: vscode.Range) {}
}

export type Steps = Map<string, StepDetail>;


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseStepsFile = (uri: vscode.Uri, text:string, steps: Steps) => {

    const lines = text.split('\n');

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo].trim();

        if (line === '' || line.startsWith("#")) {
            continue;
        }

        const step = stepRe.exec(line);
        if (step) {
            const stepText = step[4];
            const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, step[0].length));
            const reStr = stepText.replace(/{.*?}/g, '.+');
            const detail = new StepDetail(uri, range);
            steps.set(reStr, detail); // there can be only one 
        }

    }
};

