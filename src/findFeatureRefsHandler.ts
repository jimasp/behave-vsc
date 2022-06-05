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
    const featureReference = new FeatureReference(key, value);
    featureReferences.push(featureReference);
  }

  return featureReferences;
}


export function findFeatureRefsHandler(eventUri: vscode.Uri) {

  try {

    if (!eventUri || !isStepsFile(eventUri)) {
      // this should never happen - controlled by package.json editor/context
      throw `Go to feature definition must be used from a steps file, uri was: ${eventUri}`;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    let line = activeEditor.document.lineAt(activeEditor.selection.active.line).text;

    if (!line)
      return;

    line = line.trim();
    if (line == "" || line.startsWith("#"))
      return;

    const stExec = stepRe.exec(line);
    if (!stExec || !stExec[1])
      return;

    const wkspSettings = getWorkspaceSettingsForFile(eventUri);
    const featureReferences = getFeatureMatch(wkspSettings.featuresUri, stExec);

    const treeDataProvider = new FeatureReferencesTree(featureReferences);

    if (!treeView) {
      treeView = vscode.window.createTreeView("featureReferences", { treeDataProvider });
    }
    else {
      treeDataProvider.refresh(featureReferences);
    }

    //treeView.reveal(featureReferences[0]);

    vscode.commands.executeCommand(`featureReferences.focus`);

    // // note openTextDocument(stepMatch.Uri) does not behave the same as
    // // openTextDocument(vscode.Uri.file(stepMatch.uri.path))
    // // e.g. in the first case, if the user discards (reverts) a git file change the file would open as readonly
    // const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(stepMatch.uri.path));
    // const editor = await vscode.window.showTextDocument(doc, { preview: false });
    // if (!editor) {
    //   throw `Could not open editor for file:${stepMatch.uri.fsPath}`;
    // }
    // editor.selection = new vscode.Selection(stepMatch.range.start, stepMatch.range.end);
    // editor.revealRange(stepMatch.range, vscode.TextEditorRevealType.InCenter);
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