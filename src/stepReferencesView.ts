import * as vscode from 'vscode';
import { EXTENSION_NAME, showTextDocumentRange, urisMatch } from './common';
import { FeatureFileStep } from './featureParser';


export class StepReference extends vscode.TreeItem {
  public readonly children: StepReferenceDetails[];
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    private readonly featureRefDetails: FeatureFileStep[],
  ) {
    super(featureFileName, vscode.TreeItemCollapsibleState.Expanded);
    this.children = this.featureRefDetails.map(featureStep => new StepReferenceDetails(featureStep.text, featureStep, this));
  }
}

class StepReferenceDetails extends vscode.TreeItem {
  public readonly range: vscode.Range;
  public readonly contextValue = "StepReferenceDetails";
  //public readonly command: vscode.Command;

  constructor(
    public readonly label: string,
    public readonly featureStep: FeatureFileStep,
    public readonly parent: StepReference
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = undefined;
    this.range = this.featureStep.range;
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
      showTextDocumentRange(current.featureStep.uri, current.featureStep.range);
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

  // Shift+F4 shortcut - this should mirror the behaviour of vscode's own "Find All References" window Shift+F4 shortcut
  prev() {
    let selected = this._treeView.selection[0];
    if (!selected)
      selected = this._stepReferences[0];
    if (selected instanceof StepReference)
      selected = selected.children[0];

    const current = selected as StepReferenceDetails;
    let prevChild: StepReferenceDetails | undefined;
    let prevParent: StepReference | undefined;

    for (let i = 0; i < this._stepReferences.length; i++) {
      const children = this._stepReferences[i].children;
      for (let i2 = children.length - 1; i2 > -1; i2--) {
        if (urisMatch(children[i2].featureStep.uri, current.featureStep.uri)
          && children[i2].featureStep.range.start === current.featureStep.range.start) {
          prevChild = children[i2 - 1];
          if (prevChild) {
            showTextDocumentRange(prevChild.featureStep.uri, prevChild.featureStep.range);
            return this._treeView.reveal(prevChild);
          }
          prevParent = this._stepReferences[i - 1];
        }
      }
    }

    if (!prevParent)
      prevParent = this._stepReferences[this._stepReferences.length - 1];

    prevChild = prevParent.children[prevParent.children.length - 1];
    showTextDocumentRange(prevChild.featureStep.uri, prevChild.featureStep.range);
    this._treeView.reveal(prevParent.children[prevParent.children.length - 1]);
  }

  // F4 shortcut - this should mirror the behaviour of vscode's own "Find All References" window F4 shortcut
  next() {
    let selected = this._treeView.selection[0];
    if (!selected)
      selected = this._stepReferences[this._stepReferences.length - 1];
    if (selected instanceof StepReference)
      selected = selected.children[selected.children.length - 1];

    const current = selected as StepReferenceDetails;
    let nextChild: StepReferenceDetails | undefined;
    let nextParent: StepReference | undefined;

    for (let i = 0; i < this._stepReferences.length; i++) {
      const children = this._stepReferences[i].children;
      for (let i2 = 0; i2 < children.length; i2++) {
        if (urisMatch(children[i2].featureStep.uri, current.featureStep.uri)
          && children[i2].featureStep.range.start === current.featureStep.range.start) {
          nextChild = children[i2 + 1];
          if (nextChild) {
            showTextDocumentRange(nextChild.featureStep.uri, nextChild.featureStep.range);
            return this._treeView.reveal(nextChild);
          }
          nextParent = this._stepReferences[i + 1];
        }
      }
    }

    if (!nextParent)
      nextParent = this._stepReferences[0];

    nextChild = nextParent.children[0];
    showTextDocumentRange(nextChild.featureStep.uri, nextChild.featureStep.range);
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
