import * as vscode from 'vscode';
import { EXTENSION_NAME, showTextDocumentRange } from './common';
import { FeatureReferenceDetail } from './featureParser';


export class FeatureReference extends vscode.TreeItem {
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    public readonly featureRefDetails: FeatureReferenceDetail[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
  ) {
    super(featureFileName, collapsibleState);
  }
}

class FeatureReferenceDetails extends vscode.TreeItem {
  public readonly range: vscode.Range;
  public readonly contextValue = "FeatureReferenceDetails";
  public readonly command: vscode.Command;

  constructor(
    public readonly label: string,
    public readonly featureDetail: FeatureReferenceDetail
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = undefined;
    this.range = this.featureDetail.range;
    this.command = {
      command: `${EXTENSION_NAME}.openFeatureFileFromReference`,
      title: '',
      arguments: [this.featureDetail.uri, this.range]
    }
  }
}


export class FeatureReferencesTree implements vscode.TreeDataProvider<vscode.TreeItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private _featureReferences: FeatureReference[] = [];

  refresh(featureReferences: FeatureReference[]): void {
    this._featureReferences = featureReferences;
    this._onDidChangeTreeData.fire();
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
      const featureReference = element.featureRefDetails.map(featureDetail => new FeatureReferenceDetails(featureDetail.content, featureDetail));
      return Promise.resolve(featureReference);
    }

    return Promise.resolve([]);
  }

}
