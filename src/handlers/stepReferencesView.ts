import * as vscode from 'vscode';
import { openDocumentRange, urisMatch } from '../common';
import { FeatureFileStep } from '../parsers/featureParser';


export class StepReference extends vscode.TreeItem {
  public readonly children: StepReferenceDetails[];
  constructor(
    public resourceUri: vscode.Uri,
    public readonly featureFileName: string,
    private readonly featureRefDetails: FeatureFileStep[],
  ) {
    super(featureFileName, vscode.TreeItemCollapsibleState.Expanded);
    this.description = vscode.workspace.asRelativePath(resourceUri, false).replace(featureFileName, "").slice(0, -1);
    this.children = this.featureRefDetails.map(featureStep => new StepReferenceDetails(featureStep.text, featureStep, this));
    this.iconPath = new vscode.ThemeIcon('file');
  }
}

class StepReferenceDetails extends vscode.TreeItem {
  public readonly range: vscode.Range;
  public readonly contextValue = "behave-vsc.stepReferences.navKeysEnabled";

  constructor(
    public readonly label: string,
    public readonly featureFileStep: FeatureFileStep,
    public readonly parent: StepReference
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = undefined;
    this.range = this.featureFileStep.range;
    // note that treeView.OnDidChangeSelection() cannot be used instead, because that is only called when the 
    // selection *changes*, i.e. that would not fire when only one treeView item exists and it is clicked    
    this.command = {
      command: "vscode.open", // see comment in node_modules/@types/vscode/index.d.ts - TreeItem - command
      title: "Open Step Reference",
      arguments: [this.featureFileStep.uri, <vscode.TextDocumentShowOptions>{ selection: this.range }]
    }
  }
}




export class StepReferencesTree implements vscode.TreeDataProvider<vscode.TreeItem> {

  private _stepReferences: StepReference[] = [];
  private _treeView!: vscode.TreeView<vscode.TreeItem>;
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;


  private _setStepReferencesNavKeysEnabled(enable: boolean) {
    // also see StepReferenceDetails.contextValue
    vscode.commands.executeCommand('setContext', `behave-vsc.stepReferences.navKeysEnabled`, enable);
  }

  setTreeView(treeView: vscode.TreeView<vscode.TreeItem>) {
    this._treeView = treeView;
    this._treeView.onDidChangeVisibility(visibilityEvent => this._setStepReferencesNavKeysEnabled(visibilityEvent.visible));
  }

  update(stepReferences: StepReference[], message: string): void {
    this._treeView.message = message;
    this._stepReferences = stepReferences;
    this._onDidChangeTreeData.fire();
    vscode.commands.executeCommand('setContext', 'behave-vsc.stepReferences.visible', true);
    this._setStepReferencesNavKeysEnabled(this._treeView.visible);
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
        if (urisMatch(children[i2].featureFileStep.uri, current.featureFileStep.uri)
          && children[i2].featureFileStep.range.start === current.featureFileStep.range.start) {
          prevChild = children[i2 - 1];
          if (prevChild) {
            openDocumentRange(prevChild.featureFileStep.uri, prevChild.featureFileStep.range);
            return this._treeView.reveal(prevChild);
          }
          prevParent = this._stepReferences[i - 1];
        }
      }
    }

    if (!prevParent)
      prevParent = this._stepReferences[this._stepReferences.length - 1];

    prevChild = prevParent.children[prevParent.children.length - 1];
    openDocumentRange(prevChild.featureFileStep.uri, prevChild.featureFileStep.range);
    this._treeView.reveal(prevParent.children[prevParent.children.length - 1], { select: true });
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
        if (urisMatch(children[i2].featureFileStep.uri, current.featureFileStep.uri)
          && children[i2].featureFileStep.range.start === current.featureFileStep.range.start) {
          nextChild = children[i2 + 1];
          if (nextChild) {
            openDocumentRange(nextChild.featureFileStep.uri, nextChild.featureFileStep.range);
            return this._treeView.reveal(nextChild);
          }
          nextParent = this._stepReferences[i + 1];
        }
      }
    }

    if (!nextParent)
      nextParent = this._stepReferences[0];

    nextChild = nextParent.children[0];
    openDocumentRange(nextChild.featureFileStep.uri, nextChild.featureFileStep.range);
    this._treeView.reveal(nextParent.children[0], { select: true });
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
