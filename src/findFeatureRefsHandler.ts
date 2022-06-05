import * as vscode from 'vscode';
import { config } from "./configuration";
import { getWorkspaceSettingsForFile, getWorkspaceUriForFile, isStepsFile } from './common';
import { getFeatureSteps } from './fileParser';
import { getStepKey, stepRe } from "./stepsParser";
import { FeatureReference, FeatureReferencesTree } from './featureReferencesView';
import { FeatureReferenceDetail } from './featureParser';


let treeView: vscode.TreeView<vscode.TreeItem>;

export function getFeatureMatch(featuresUri: vscode.Uri, stExec: RegExpExecArray): FeatureReference[] {

  let stepKey = getStepKey(stExec, featuresUri);
  stepKey = stepKey.replace(`${featuresUri.path}:`, "");

  const allFeatureSteps = getFeatureSteps();
  // filter matches to the workspace that raised the click event
  const wkpsFeatureSteps = allFeatureSteps.filter((fs) => fs.key.startsWith(featuresUri.path));
  // then remove the featuresUriPath prefix from the keys
  const featureSteps = [...wkpsFeatureSteps].map((fs) => [fs.key.replace(`${featuresUri.path}:`, ""), fs.feature]);

  // get matches
  const featureDetails = new Map<string, FeatureReferenceDetail[]>();
  for (const [key, value] of featureSteps) {
    const rx = new RegExp(stepKey, "i");
    const sKey = key as string;
    const match = rx.exec(sKey);
    if (match && match.length !== 0) {
      const featureDetail = value as FeatureReferenceDetail;
      const featureReference = featureDetails.get(featureDetail.fileName);
      if (!featureReference)
        featureDetails.set(featureDetail.fileName, [featureDetail]);
      else
        featureReference.push(featureDetail);
    }
  }

  // convert to array of feature references
  const featureReferences: FeatureReference[] = [];
  for (const [key, value] of featureDetails) {
    const featureReference = new FeatureReference(value[0].uri, key, value);
    featureReferences.push(featureReference);
  }

  return featureReferences;
}

const treeDataProvider = new FeatureReferencesTree();
const featureReferences: FeatureReference[] = [];

export function refreshFeatureRefsHandler() {
  try {
    // refresh with current feature references
    treeDataProvider.refresh(featureReferences);
  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    config.logger.showError(e);
  }
}


export function findFeatureRefsHandler(eventUri: vscode.Uri) {

  try {

    if (!eventUri || !isStepsFile(eventUri)) {
      // this should never happen - controlled by package.json editor/context
      throw `Find All Feature References must be used from a steps file, uri was: ${eventUri}`;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;

    if (!line)
      return;

    line = line.trim();
    if (line == "" || !line.startsWith("def ")) {
      vscode.window.showInformationMessage('To find feature references, you must be on a step line that contains a ' +
        'step definition, e.g. "def mystep(context)".');
      return;
    }

    const wkspSettings = getWorkspaceSettingsForFile(eventUri);
    const featureReferences: FeatureReference[] = [];

    for (let i = activeEditor.selection.active.line - 1; i > 0; i--) {
      line = activeEditor.document.lineAt(i).text;
      line = line.trim();
      if (line == "")
        continue;
      const stExec = stepRe.exec(line);
      if (!stExec || !stExec[1])
        break;
      const featureRefs = getFeatureMatch(wkspSettings.featuresUri, stExec);
      featureReferences.push(...featureRefs);
      console.log(featureReferences);
    }


    //featureReferences.sort((a, b) => a.resourceUri < b.resourceUri ? -1 : 1);
    //const treeDataProvider = new FeatureReferencesTree(featureReferences);

    if (!treeView) {
      // TODO: pass this is as a pre-registered disposable
      treeView = vscode.window.createTreeView("featureReferences", { treeDataProvider });
      treeDataProvider.refresh(featureReferences);
    }
    else {
      treeDataProvider.refresh(featureReferences);
      //treeView.reveal(featureReferences[0]);
    }

    //treeView.reveal(featureReferences[0]);

    vscode.commands.executeCommand(`featureReferences.focus`);


  }
  catch (e: unknown) {
    // entry point function (handler) - show error  
    try {
      const wkspUri = getWorkspaceUriForFile(eventUri);
      config.logger.showError(e, wkspUri);
    }
    catch {
      config.logger.showError(e);
    }
  }

}