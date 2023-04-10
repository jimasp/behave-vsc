import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { uriId, isFeatureFile } from '../common';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { diagLog } from '../logger';
import { FolderNode } from './fileParser';



export type TestNode = FolderNode | FeatureNode | ChildNode;
export type TestData = WeakMap<vscode.TestItem, TestNode>;


export class FeatureNode {
  public didResolve = false;

  public async createChildTestItemsFromFeatureFileContent(wkspSettings: WorkspaceSettings, content: string, testData: TestData,
    controller: vscode.TestController, item: vscode.TestItem, caller: string) {
    if (!item.uri)
      throw new Error("missing test item uri");
    if (!isFeatureFile(item.uri))
      throw new Error(`${item.uri.path} is not a feature file`);

    this.didResolve = true;
    item.error = undefined;

    const featureUri = item.uri;
    const featureName = item.label;
    const featureFileWkspRelativePath = vscode.workspace.asRelativePath(featureUri, false);
    const featureFilename = featureUri.path.split('/').pop();
    if (featureFilename === undefined)
      throw new Error("featureFilename is undefined");
    type Parent = { item: vscode.TestItem, children: vscode.TestItem[] }
    const ancestors: Parent[] = [];


    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop();
        if (finished === undefined)
          throw new Error("finished is undefined");
        try {
          finished.item.children.replace(finished.children);
        }
        catch (e: unknown) {
          let err = (e as Error).toString();
          if (err.includes("duplicate test item")) {
            const n = err.lastIndexOf('/');
            const scen = err.substring(n);
            err = err.replace(scen, `. Duplicate scenario name: "${scen.slice(1)}".`);
            // don't throw here, show it and carry on
            config.logger.showError(err, wkspSettings.uri);
          }
          else
            throw e;
        }
      }
    };


    let currentOutline: Parent;
    let currentOutlineRunName: string;
    let currentExamplesTable: Parent;
    let exampleTable = 0;
    let exampleRowIdx = 0;

    const onFeatureLine = (range: vscode.Range) => {
      // feature test item is already created by calller, just update it and add it to ancestors
      item.range = range;
      item.label = featureName;
      ancestors.push({ item: item, children: [] });
    }

    const onScenarioLine = (range: vscode.Range, scenarioName: string, isOutline: boolean) => {
      exampleTable = 0;

      const id = `${uriId(featureUri)}/${scenarioName}`;
      const testItem = controller.createTestItem(id, scenarioName, featureUri);
      testItem.range = range;

      const parent = ancestors[0];
      parent.children.push(testItem);

      const runName = getRunName(scenarioName, isOutline);
      const itemType = isOutline ? ChildType.ScenarioOutline : ChildType.Scenario;

      const data = new ChildNode(itemType, featureFilename, featureFileWkspRelativePath, featureName, scenarioName, runName);
      testData.set(testItem, data);

      if (isOutline) {
        currentOutline = { item: testItem, children: [] };
        currentOutlineRunName = runName;
        ancestors.push(currentOutline);
      }

      diagLog(`created child test item scenario ${testItem.id} from ${featureUri.path}`);
    }

    const onExamplesLine = (range: vscode.Range, examplesLine: string) => {

      exampleTable++;
      exampleRowIdx = 0;

      if (!currentOutline)
        throw new Error(`could not find scenario outline parent for ${examplesLine}`);

      examplesLine = examplesLine.replace(/Examples:/i, '').trim();
      const id = `${currentOutline.item.id}/${examplesLine}`;
      const testItem = controller.createTestItem(id, examplesLine, featureUri);
      testItem.range = range;

      currentOutline.children.push(testItem);
      currentExamplesTable = { item: testItem, children: [] };
      ancestors.push(currentExamplesTable);

      const data = new ChildNode(ChildType.ExampleTable, featureFilename, featureFileWkspRelativePath, featureName,
        currentOutline.item.label, `${currentOutlineRunName} -- @.* ${examplesLine}$`);
      testData.set(testItem, data);

      diagLog(`created child test item examples ${testItem.id} from ${featureUri.path}`);
    }

    const onExampleLine = (range: vscode.Range, rowText: string) => {

      if (exampleRowIdx++ == 0) // header row
        return;


      const id = `${currentExamplesTable.item.id}/${rowText}`;
      const testItem = controller.createTestItem(id, rowText, featureUri);
      testItem.range = range;

      const parent = ancestors[ancestors.length - 1];
      parent.children.push(testItem);

      const rowId = `${exampleTable}.${exampleRowIdx - 1} ${currentExamplesTable.item.label}`;
      const runName = getRunName(currentOutline.item.label, true, rowId);
      const data = new ChildNode(ChildType.ExampleRow, featureFilename, featureFileWkspRelativePath, featureName,
        currentOutline.item.label, runName);
      testData.set(testItem, data);

      diagLog(`created child example item from scenario ???? ${testItem.id} from ${featureUri.path}`);
    }

    parseFeatureContent(wkspSettings, featureUri, content, caller, onScenarioLine, onFeatureLine, onExamplesLine, onExampleLine);

    ascend(0); // assign children for all remaining items
  }

}


function getRunName(scenarioName: string, isOutline: boolean, rowId?: string) {
  let escapeRegExChars = scenarioName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (isOutline) // scenario outline with a <param> in its name
    escapeRegExChars = escapeRegExChars.replace(/<.*?>/g, ".*");

  escapeRegExChars = escapeRegExChars.replace(/"/g, '\\"');

  return "^" + escapeRegExChars + (isOutline ? rowId ? ` -- @${rowId}` : "" : "$");
}


export enum ChildType {
  Scenario,
  ScenarioOutline,
  ExampleTable,
  ExampleRow
}


export class ChildNode {
  public result: string | undefined;
  constructor(
    public readonly nodeType: ChildType,
    public readonly featureFileName: string,
    public readonly featureFileWorkspaceRelativePath: string,
    public readonly featureName: string,
    public readonly scenarioName: string,
    public readonly runName: string,
  ) { }
}

