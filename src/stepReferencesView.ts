import * as vscode from 'vscode';
import { EXTENSION_NAME } from './common';
import { StepReferenceDetail } from './featureParser';


export class StepReference extends vscode.TreeItem {
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    public readonly featureRefDetails: StepReferenceDetail[],
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
    public readonly featureDetail: StepReferenceDetail
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

  update(stepReferences: StepReference[], treeView: vscode.TreeView<vscode.TreeItem>): void {
    // note - order of execution here is important to how the display is updated,
    // i.e. we have to watch for artifacts when going between having results/no results or the reverse
    // (e.g. treeView.message is set on two separate lines, and fire() is in the middle)
    if (stepReferences.length > 0)
      treeView.message = "";
    this._stepReferences = stepReferences;
    this._onDidChangeTreeData.fire();
    if (stepReferences.length === 0)
      treeView.message = "No step references found";
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
      const stepReference = element.featureRefDetails.map(featureDetail => new StepReferenceDetails(featureDetail.content, featureDetail));
      return Promise.resolve(stepReference);
    }

    return Promise.resolve([]);
  }

}
