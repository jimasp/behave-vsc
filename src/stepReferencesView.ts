import * as vscode from 'vscode';
import { EXTENSION_NAME, showTextDocumentRange } from './common';
import { FeatureStepDetail } from './featureParser';


export class StepReference extends vscode.TreeItem {
  public readonly children: StepReferenceDetails[];
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    private readonly featureRefDetails: FeatureStepDetail[],
  ) {
    super(featureFileName, vscode.TreeItemCollapsibleState.Expanded);
    this.children = this.featureRefDetails.map(featureDetail => new StepReferenceDetails(featureDetail.lineContent, featureDetail, this));
  }
}

class StepReferenceDetails extends vscode.TreeItem {
  public readonly range: vscode.Range;
  public readonly contextValue = "StepReferenceDetails";
  //public readonly command: vscode.Command;

  constructor(
    public readonly label: string,
    public readonly featureDetail: FeatureStepDetail,
    public readonly parent: StepReference
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = undefined;
    this.range = this.featureDetail.range;
  }
}



export class StepReferencesTree implements vscode.TreeDataProvider<vscode.TreeItem> {

  private _stepReferences: StepReference[] = [];
  private _treeView!: vscode.TreeView<vscode.TreeItem>;
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private _setCanNavigate(enable: boolean) {
    vscode.commands.executeCommand('setContext', `${EXTENSION_NAME}.stepReferences.canNavigate`, enable);
  }

  setTreeView(treeView: vscode.TreeView<vscode.TreeItem>) {

    treeView.onDidChangeVisibility(visibilityEvent => this._setCanNavigate(visibilityEvent.visible));

    treeView.onDidChangeSelection(selectionEvent => {
      if (selectionEvent.selection.length !== 1)
        return;
      const current = selectionEvent.selection[0] as StepReferenceDetails;
      showTextDocumentRange(current.featureDetail.uri, current.featureDetail.range);
      this._setCanNavigate(true);
    });

    this._treeView = treeView;
  }

  update(stepReferences: StepReference[], message: string): void {
    this._treeView.message = message;
    this._stepReferences = stepReferences;
    this._onDidChangeTreeData.fire();
    this._setCanNavigate(this._treeView.visible);
  }

  prev() {
    if (this._treeView.selection.length !== 1)
      return;

    const current = this._treeView.selection[0] as StepReferenceDetails;
    let prevChild: StepReferenceDetails | undefined;
    let prevParent: StepReference | undefined;

    for (let i = 0; i < this._stepReferences.length; i++) {
      const children = this._stepReferences[i].children;
      for (let i2 = children.length - 1; i2 > -1; i2--) {
        if (children[i2].featureDetail.uriString === current.featureDetail.uriString
          && children[i2].featureDetail.range.start === current.featureDetail.range.start) {
          prevChild = children[i2 - 1];
          if (prevChild) {
            showTextDocumentRange(prevChild.featureDetail.uri, prevChild.featureDetail.range);
            return this._treeView.reveal(prevChild);
          }
          prevParent = this._stepReferences[i - 1];
        }
      }
    }

    if (!prevParent)
      return;

    prevChild = prevParent.children[prevParent.children.length - 1];
    showTextDocumentRange(prevChild.featureDetail.uri, prevChild.featureDetail.range);
    this._treeView.reveal(prevParent.children[prevParent.children.length - 1]);
  }


  next() {
    if (this._treeView.selection.length !== 1)
      return;

    const current = this._treeView.selection[0] as StepReferenceDetails;
    let nextChild: StepReferenceDetails | undefined;
    let nextParent: StepReference | undefined;

    for (let i = 0; i < this._stepReferences.length; i++) {
      const children = this._stepReferences[i].children;
      for (let i2 = 0; i2 < children.length; i2++) {
        if (children[i2].featureDetail.uriString === current.featureDetail.uriString
          && children[i2].featureDetail.range.start === current.featureDetail.range.start) {
          nextChild = children[i2 + 1];
          if (nextChild) {
            showTextDocumentRange(nextChild.featureDetail.uri, nextChild.featureDetail.range);
            return this._treeView.reveal(nextChild);
          }
          nextParent = this._stepReferences[i + 1];
        }
      }
    }

    if (!nextParent)
      return;

    nextChild = nextParent.children[0];
    showTextDocumentRange(nextChild.featureDetail.uri, nextChild.featureDetail.range);
    this._treeView.reveal(nextParent.children[0]);
  }

  getParent(element: vscode.TreeItem): vscode.TreeItem | undefined {
    const srd = element as StepReferenceDetails;
    if (!srd)
      return undefined;
    return srd.parent;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!this._stepReferences)
      return [];

    if (!element)
      return this._stepReferences.length > 0 ? this._stepReferences : [];

    if (element instanceof StepReference)
      return element.children;

    return [];
  }


}
