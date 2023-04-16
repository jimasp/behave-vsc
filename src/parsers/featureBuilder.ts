import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { uriId, isFeatureFile } from '../common/helpers';
import { config } from "../common/configuration";
import { WorkspaceSettings } from "../common/settings";
import { diagLog } from '../common/logger';
import { FolderNode } from './fileParser';
import { toUnicodeVariant } from '../formatters/toUnicodeVariant';



export type TestNode = FolderNode | FeatureNode | FeatureDescendentNode;
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
          const err = (e as Error).toString();
          if (err.includes("duplicate test item")) {
            const n = err.lastIndexOf('/') + 1;
            const dupe = err.substring(n);
            const text = `Duplicate item "${dupe}" in file ${featureFileWkspRelativePath}`;
            config.logger.showWarn(text, wkspSettings.uri);
          }
          else
            throw e;
        }
      }
    };


    let currentOutline: Parent;
    let currentOutlineRunName: string;
    let currentExamplesTable: Parent;
    let currentExamplesTableRunName: string;
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

      let runName = "^" + escapeRunName(scenarioName);
      runName = isOutline ? runName.replace(/<.*?>/g, ".*") : runName + "$";

      const itemType = isOutline ? DescendentType.ScenarioOutline : DescendentType.Scenario;

      const data = new FeatureDescendentNode(itemType, featureFilename, featureFileWkspRelativePath, featureName, scenarioName, runName);
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
      const label = toUnicodeVariant(examplesLine, "si");
      const testItem = controller.createTestItem(id, label, featureUri);
      testItem.range = range;

      currentOutline.children.push(testItem);
      currentExamplesTable = { item: testItem, children: [] };
      currentExamplesTableRunName = `${currentOutlineRunName} -- @.* ${escapeRunName(examplesLine)}$`;
      ancestors.push(currentExamplesTable);

      const data = new FeatureDescendentNode(DescendentType.ExampleTable, featureFilename, featureFileWkspRelativePath, featureName,
        currentOutline.item.label, currentExamplesTableRunName);
      testData.set(testItem, data);

      diagLog(`created child test item examples ${testItem.id} from ${featureUri.path}`);
    }

    const onExampleLine = (range: vscode.Range, rowText: string) => {

      if (exampleRowIdx++ == 0) // header row
        return;

      const id = `${currentExamplesTable.item.id}/${rowText}`;
      const label = toUnicodeVariant(rowText, "si");
      const testItem = controller.createTestItem(id, label, featureUri);
      testItem.range = range;

      const parent = ancestors[ancestors.length - 1];
      parent.children.push(testItem);

      const runName = currentExamplesTableRunName.replace("-- @.*", `-- @${exampleTable}.${exampleRowIdx - 1}`);
      const data = new FeatureDescendentNode(DescendentType.ExampleRow, featureFilename, featureFileWkspRelativePath, featureName,
        currentOutline.item.label, runName);
      testData.set(testItem, data);

      diagLog(`created child example item from scenario ???? ${testItem.id} from ${featureUri.path}`);
    }

    parseFeatureContent(wkspSettings, featureUri, content, caller, onScenarioLine, onFeatureLine, onExamplesLine, onExampleLine);

    ascend(0); // assign children for all remaining items
  }

}


function escapeRunName(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '\\"');
}


export enum DescendentType {
  Scenario,
  ScenarioOutline,
  ExampleTable,
  ExampleRow
}


export class FeatureDescendentNode {
  public result: string | undefined;
  constructor(
    public readonly nodeType: DescendentType,
    public readonly featureFileName: string,
    public readonly featureFileWorkspaceRelativePath: string,
    public readonly featureName: string,
    public readonly scenarioName: string,
    public readonly runName: string,
  ) { }
}

