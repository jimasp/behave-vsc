import * as vscode from 'vscode';
import { FeatureReferenceDetail } from './featureParser';


export class FeatureReference extends vscode.TreeItem {
  constructor(
    public readonly featureName: string,
    public readonly featureRefDetails: FeatureReferenceDetail[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
  ) {
    super(featureName, collapsibleState);
  }
}

class FeatureDetails extends vscode.TreeItem {
  constructor(
    public readonly content: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(content, collapsibleState);
  }
}


export class FeatureReferencesTree implements vscode.TreeDataProvider<vscode.TreeItem> {

  private _featureReferences: FeatureReference[];

  constructor(featureReferences: FeatureReference[]) {
    this._featureReferences = featureReferences;
  }

  refresh(featureReferences: FeatureReference[]): void {
    this._featureReferences = featureReferences;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!this._featureReferences)
      return Promise.resolve([]);

    if (!element)
      return this._featureReferences.length > 0 ? Promise.resolve(this._featureReferences) : Promise.resolve([]);

    if (element instanceof FeatureReference) {
      const featureReference = element.featureRefDetails.map(featureDetail => new FeatureDetails(featureDetail.content));
      return Promise.resolve(featureReference);
    }

    return Promise.resolve([]);
  }

}


