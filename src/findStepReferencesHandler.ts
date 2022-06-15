import * as vscode from 'vscode';
import { config } from "./configuration";
import { getUriMatchString, getWorkspaceUriForFile, isStepsFile, urisMatch } from './common';
import { getStepMappings } from './fileParser';
// import { parseStepsFile, StepFileStep, StepFileStepMap } from "./stepsParser";
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { FeatureStep } from './featureParser';
import { waitOnParseComplete } from './gotoStepHandler';


const treeDataProvider = new StepReferencesTree();
export const treeView: vscode.TreeView<vscode.TreeItem> =
  vscode.window.createTreeView("behave-vsc_stepReferences", { showCollapseAll: true, treeDataProvider: treeDataProvider });
treeDataProvider.setTreeView(treeView);
const refreshStore: { uri: vscode.Uri | undefined, lineNo: number } = { uri: undefined, lineNo: -1 };


function getReferencesToStepFunction(stepsFileUri: vscode.Uri, lineNo: number): StepReference[] {

  const stepMappingsForThisStepsFile = getStepMappings().filter(x => x.stepFileStep && urisMatch(x.stepFileStep.uri, stepsFileUri));
  const featureStepMatches = new Map<string, FeatureStep[]>();


  stepMappingsForThisStepsFile.forEach(sm => {
    console.log(sm.stepFileStep);
    if (sm.stepFileStep && sm.stepFileStep.funcLineNo === lineNo) {
      const featureKey = getUriMatchString(sm.featureStep.uri);
      const parentFeature = featureStepMatches.get(featureKey);
      if (!parentFeature)
        featureStepMatches.set(featureKey, [sm.featureStep]);
      else
        parentFeature.push(sm.featureStep);
    }
  });

  // convert to array of step references
  const stepReferences: StepReference[] = [];
  for (const [, featureSteps] of featureStepMatches) {
    const stepReference = new StepReference(featureSteps[0].uri, featureSteps[0].fileName, featureSteps);
    stepReferences.push(stepReference);
  }

  return stepReferences;
}


export function refreshStepReferencesWindow() {
  if (!refreshStore.uri)
    return;
  findStepReferencesHandler(undefined, true);
}


// function getFeatureStepMatchTypes(stepType: string): string[] {
//   if (stepType === "given" || stepType === "when" || stepType === "then")
//     return [stepType, "and", "but"];
//   return ["given", "and", "when", "then", "but"];
// }


export async function findStepReferencesHandler(ignored?: vscode.Uri, refresh = false) {

  // we won't use a passed-in "ignored" event parameter for the uri, because the default extension keybinding 
  // in package.json doesn't provide it to this function
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;
  const fileUri = activeEditor.document.uri;



  try {

    if (!refresh && (!fileUri || !isStepsFile(fileUri))) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${fileUri}`;
    }

    if (!await waitOnParseComplete())
      return;

    // let stepRes: string[];
    // const wkspSettings = getWorkspaceSettingsForFile(fileUri);
    // const stepFileSteps = getStepFileSteps();
    // let stepFileStepsForFile: StepFileStep[];

    // if (refresh) {
    //   // if (!refreshStore.uri)
    //   //   throw "refreshStore.uri is undefined";
    //   // if (!refreshStore.lineNo)
    //   //   throw "refreshStore.lineNo is undefined";
    //   // lineNo = refreshStore.lineNo;

    //   //     const uriMatchString = getUriMatchString(refreshEventUri);
    //   //   stepFileStepsForFile = [...stepFileSteps.values()].filter(stepFileStep => getUriMatchString(stepFileStep.uri) === uriMatchString);

    //   //   // clone to preserve refresh state (in case of ctrl+z revert on the steps file)
    //   //   stepRes = [...refreshStepTexts];

    //   //   // disable any keys that are no longer in the steps file 
    //   //   stepRes.forEach((stepText, idx) => {
    //   //     if (!stepFileStepsForFile.filter(sfs => sfs.textAsRe !== stepText)) {
    //   //       stepRes[idx] = "$^";
    //   //     }
    //   //   });

    // }
    if (!refresh) {
      refreshStore.uri = fileUri;
      refreshStore.lineNo = activeEditor.selection.active.line;
      //   stepRes = await getStepRanges(activeEditor, wkspSettings.featuresUri, fileUri);
      //   if (!stepRes)
      //     return;

      //   // store in module vars for refresh
      //   refreshStepTexts = stepRes;
      //   refreshEventUri = fileUri;
    }

    const stepReferences = getReferencesToStepFunction(fileUri, refreshStore.lineNo);

    let refCount = 0;
    stepReferences.forEach(sr => refCount += sr.children.length);
    const message = refCount === 0
      ? "No results"
      : `${refCount} result${refCount > 1 ? "s" : ""} in ${stepReferences.length} file${stepReferences.length > 1 ? "s" : ""}`;

    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);
    treeDataProvider.update(stepReferences, message);

    // keep current visibility on a refresh
    if (!refresh)
      vscode.commands.executeCommand(`behave-vsc_stepReferences.focus`);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(fileUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}


// async function getStepRanges(activeEditor: vscode.TextEditor, stepFileStepsForFile: StepFileStepMap, featuresUri: vscode.Uri, fileUri: vscode.Uri): Promise<string[]> {

//   const stepRes: string[] = [];

//   let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;
//   if (!line)
//     return [];

//   line = line.trim();
//   if (line == "" || (!line.startsWith("def ") && !line.startsWith("async def "))) {
//     vscode.window.showInformationMessage('Selected line is not a step function definition.');
//     return [];
//   }


//   let start = 0;
//   const end = activeEditor.selection.active.line - 1;
//   const re = /^(@|\)|"|').*/;

//   // go back up line-by-line to find the first line above the selected function definition that doesn't match the regex
//   // i.e. the first line that is not a @given/@when/@...
//   for (let i = end; i > 0; i--) {
//     line = activeEditor.document.lineAt(i).text;
//     line = line.trim();
//     if (line == "")
//       continue;

//     const stExec = re.exec(line);
//     if (!stExec || stExec.length === 0)
//       break;
//     start = i;
//   }

//   if (start !== 0) {
//     // const tempMap: StepFileStepMap = new Map<string, StepFileStep>();
//     // // reuse the parseStepsFile algorithm (including multiline considerations) to get the 
//     // // step map just for this part of the file
//     // await parseStepsFile(featuresUri, fileUri, "getMatchKeys", tempMap, start, end + 1);

//     // // return the stepTexts for these lines
//     // for (const [, stepFileStep] of tempMap) {
//     //   stepRes.push(stepFileStep.textAsRe);
//     // }


//     // // match on ranges rather than reTexts, in case there are duplicate step texts which would give us invalid results
//     // for (const [, stepFileStep] of stepFileStepsForFile) {
//     //   if(stepFileStep.range.start >= start && stepFileStep.range.end <= end) {
//     //     stepRes.push(stepFileStep.range);
//     //   }
//     // }
//   }


//   if (stepRes.length === 0) {
//     vscode.window.showInformationMessage('Selected line is not a step function definition. (No preceding step text found.)');
//     return [];
//   }

//   return stepRes;
// }


export function prevStepReferenceHandler() {
  try {
    treeDataProvider.prev();
  }
  catch (e: unknown) {
    // entry point function (handler) - show error   
    config.logger.showError(e);
  }
}

export function nextStepReferenceHandler() {
  try {
    treeDataProvider.next();
  }
  catch (e: unknown) {
    // entry point function (handler) - show error   
    config.logger.showError(e);
  }
}
