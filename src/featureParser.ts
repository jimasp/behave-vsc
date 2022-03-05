import * as vscode from 'vscode';
import config from "./configuration";
import { getContentFromFilesystem } from './testTree';


const featureReStr = "^(\\s*|\\s*#\\s*)Feature:(\\s*)(.+)(\\s*)$";
const featureReLine = new RegExp(featureReStr);
const featureReFile = new RegExp(featureReStr, "m");
const scenarioReLine = /^(\s*)(Scenario|Scenario Outline):(\s*)(.+)(\s*)$/;
const scenarioOutlineRe = /^(\s*)Scenario Outline:(\s*)(.+)(\s*)$/;


export const getFeatureNameFromFile = (uri:vscode.Uri): string =>  {
    const content = getContentFromFilesystem(uri);
    const featureName = featureReFile.exec(content);
    if(featureName === null) {
        const em = "no feature found in file" + uri.fsPath;
        config.logger.logError(em);
        throw em;
    }
    return featureName[3];
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseFeatureFile = (featureName: string, text: string, 
    onScenarioLine:(range: vscode.Range, featureName:string, scenarioName:string, isOutline: boolean, fastSkip:boolean) => void) => {

    const lines = text.split('\n');
    let fastSkipFeature = false;

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo].trim();

        if (line === '' || line.startsWith("#")) {
            continue;
        }

        const scenario = scenarioReLine.exec(line);
        if (scenario) {
            let fastSkipScenario = false;            
            if(fastSkipFeature) {
                fastSkipScenario = true;
            }
            else {
                config.userSettings.fastSkipList.forEach(skipStr => {
                    if(skipStr.startsWith("@") && lines[lineNo-1].indexOf(skipStr) !== -1) {
                        fastSkipScenario = true;
                    }
                });
            }
            
            const scenarioName = scenario[4];
            const isOutline = scenarioOutlineRe.exec(line) !== null;
            const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
            onScenarioLine(range, featureName, scenarioName, isOutline, fastSkipScenario);
            continue;
        }

        const feature = featureReLine.exec(line);
        if (feature) {
            featureName = feature[3];    

            if(lineNo > 0) {
                config.userSettings.fastSkipList.forEach(skipStr => {
                    if(skipStr.startsWith("@") && lines[lineNo-1].indexOf(skipStr) !== -1) {
                        fastSkipFeature = true;
                    }
                });
            }
        }
    }
};

