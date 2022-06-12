import * as vscode from 'vscode';
import { config } from "./configuration";
import { afterPathSepr, afterSepr, beforeSepr, getUriMatchString, getWorkspaceSettingsForFile, getWorkspaceUriForFile, isStepsFile, sepr, urisMatch } from './common';
import { getFeatureSteps } from './fileParser';
import { parseRepWildcard, parseStepsFile, StepDetail, StepMap } from "./stepsParser";
import { StepReference as StepReference, StepReferencesTree as StepReferencesTree } from './stepReferencesView';
import { FeatureStepDetail } from './featureParser';
import { WorkspaceSettings } from './settings';


let treeView: vscode.TreeView<vscode.TreeItem>;

export function getStepReferences(featuresUri: vscode.Uri, matchKeys: string[]): StepReference[] {

  const featureDetails = new Map<string, FeatureStepDetail[]>();
  const allFeatureSteps = getFeatureSteps();
  const featuresUriMatchString = getUriMatchString(featuresUri);

  // filter matches to the workspace that raised the click event
  const wkpsFeatureSteps = allFeatureSteps.filter((fs) => fs.key.startsWith(featuresUriMatchString));
  // then remove the fileUri match string prefix from the keys
  const featureSteps = [...wkpsFeatureSteps].map((fs) => [afterPathSepr(fs.key), fs.feature]);


  for (const key of matchKeys) {
    const stepMatchTypes = getFeatureStepMatchTypes(beforeSepr(key).slice(1));
    const matchStr = afterSepr(key);

    // get matches for each matching type
    for (const matchType of stepMatchTypes) {
      const stepKey = "^" + matchType + sepr + matchStr;

      for (const [key, value] of featureSteps) {
        const rx = new RegExp(stepKey, "i");
        const sKey = key as string;
        const match = rx.exec(sKey);
        if (match && match.length !== 0) {
          const featureDetail = value as FeatureStepDetail;
          const stepReference = featureDetails.get(featureDetail.fileName);
          if (!stepReference)
            featureDetails.set(featureDetail.fileName, [featureDetail]);
          else
            stepReference.push(featureDetail);
        }
      }

    }
  }

  // convert to array of step references
  const stepReferences: StepReference[] = [];
  for (const [key, value] of featureDetails) {
    const stepReference = new StepReference(value[0].uri, key, value);
    stepReferences.push(stepReference);
  }

  return stepReferences;
}

const treeDataProvider = new StepReferencesTree();
let refreshEventUri: vscode.Uri | undefined;
let refreshMatchKeys: string[];

export function refreshStepReferencesHandler() {
  try {
    if (!refreshEventUri)
      return;
    findStepReferencesHandler(refreshEventUri, refreshMatchKeys);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    config.logger.showError(e);
  }
}


function getFeatureStepMatchTypes(stepType: string): string[] {
  if (stepType === "given" || stepType === "when" || stepType === "then")
    return [stepType, "and", "but"];
  return ["given", "and", "when", "then", "but"];
}


export async function findStepReferencesHandler(ignored: vscode.Uri, refreshKeys?: string[]) {

  // we won't use a passed-in "ignored" event parameter, because the default extension keybinding 
  // in package.json doesn't provide it to this function
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor)
    return;

  const docUri = activeEditor.document.uri;

  try {

    if (!refreshKeys && (!docUri || !isStepsFile(docUri))) {
      // this should never happen - command availability context is controlled by package.json editor/context
      throw `Find All Step References must be used from a steps file, uri was: ${docUri}`;
    }


    let matchKeys: string[] | undefined;
    const wkspSettings = getWorkspaceSettingsForFile(docUri);
    const stepReferences: StepReference[] = [];


    if (refreshKeys) {
      matchKeys = refreshKeys;
    }
    else {
      matchKeys = await getMatchKeys(activeEditor, docUri, wkspSettings);
      if (!matchKeys)
        return;

      // store in module vars for refresh
      refreshMatchKeys = matchKeys;
      refreshEventUri = docUri;
    }

    const featureRefs = getStepReferences(wkspSettings.featuresUri, matchKeys);
    stepReferences.push(...featureRefs);

    let refCount = 0;
    stepReferences.forEach(x => refCount += x.featureRefDetails.length);

    let message = "";
    if (matchKeys.filter(k => k.endsWith(parseRepWildcard)).length > 0 && refCount > 1) {
      message = "WARNING: step text ends with unquoted {parameter}, mismatches possible";
    }
    else {
      message = refCount === 0
        ? "No results"
        : `${refCount} result${refCount > 1 ? "s" : ""} in ${stepReferences.length} file${stepReferences.length > 1 ? "s" : ""}`;
    }

    //stepReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);

    if (!treeView) {
      // TODO: pass this is as a pre-registered disposable
      treeView = vscode.window.createTreeView("behave-vsc_stepReferences", { showCollapseAll: true, treeDataProvider });
      treeDataProvider.update(stepReferences, treeView, message);
    }
    else {
      treeDataProvider.update(stepReferences, treeView, message);
    }

    // refresh can be called from code, but will already be shown if a user click, so keep current visibility
    if (!refreshKeys)
      vscode.commands.executeCommand(`behave-vsc_stepReferences.focus`);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(docUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}


async function getMatchKeys(activeEditor: vscode.TextEditor, docUri: vscode.Uri, wkspSettings: WorkspaceSettings): Promise<string[] | undefined> {

  const matchKeys: string[] = [];

  let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;
  if (!line)
    return;

  line = line.trim();
  if (line == "" || (!line.startsWith("def ") && !line.startsWith("async def "))) {
    vscode.window.showInformationMessage('Selected line is not a step function definition.');
    return;
  }


  let start = 0;
  const end = activeEditor.selection.active.line - 1;
  const re = /^(@|\)|"|').*/;

  // go back up line-by-line to find the first line that doesn't match the regex
  for (let i = end; i > 0; i--) {
    line = activeEditor.document.lineAt(i).text;
    line = line.trim();
    if (line == "")
      continue;

    const stExec = re.exec(line);
    if (!stExec || stExec.length === 0)
      break;
    start = i;
  }

  if (start !== 0) {
    const stepsMap: StepMap = new Map<string, StepDetail>();
    // reuse the parseStepsFile algorithm (including multiline considerations) to get the step map just for this file range
    await parseStepsFile(wkspSettings.featuresUri, docUri, "getMatchKeys", stepsMap, start, end + 1);

    for (const [key] of stepsMap) {
      const stepKey = key.replace(`${wkspSettings.featuresUri.path}${sepr}`, "");
      matchKeys.push(stepKey);
    }
  }

  if (matchKeys.length === 0) {
    vscode.window.showInformationMessage('Selected line is not a step function definition. (No preceding step text found.)');
    return;
  }

  return matchKeys;
}


