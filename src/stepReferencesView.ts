import * as vscode from 'vscode';
import { EXTENSION_NAME } from './common';
import { FeatureStepDetail } from './featureParser';


export class StepReference extends vscode.TreeItem {
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    public readonly featureRefDetails: FeatureStepDetail[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Expanded
  ) {
    super(featureFileName, collapsibleState);
  }
}

class StepReferenceDetails extends vscode.TreeItem {
  public readonly range: vscode.Range;
  public readonly contextValue = "StepReferenceDetails";
  public readonly command: vscode.Command;

  constructor(
    public readonly label: string,
    public readonly featureDetail: FeatureStepDetail
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


export class StepReferencesTree implements vscode.TreeDataProvider<vscode.TreeItem> {

  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private _stepReferences: StepReference[] = [];

  update(stepReferences: StepReference[], treeView: vscode.TreeView<vscode.TreeItem>, message: string): void {
    treeView.message = message;
    this._stepReferences = stepReferences;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!this._stepReferences)
      return Promise.resolve([]);

    if (!element)
      return this._stepReferences.length > 0 ? Promise.resolve(this._stepReferences) : Promise.resolve([]);

    if (element instanceof StepReference) {
      const stepReference = element.featureRefDetails.map(featureDetail => new StepReferenceDetails(featureDetail.lineContent, featureDetail));
      return Promise.resolve(stepReference);
    }

    return Promise.resolve([]);
  }

}
