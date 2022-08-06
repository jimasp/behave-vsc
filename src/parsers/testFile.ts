import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { getContentFromFilesystem, uriMatchString, isFeatureFile, WkspError } from '../common';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { diagLog } from '../logger';

let generationCounter = 0;
export type BehaveTestData = TestFile | Feature | Scenario;
export type TestData = WeakMap<vscode.TestItem, BehaveTestData>;


export class TestFile {
  public didResolve = false;

  public async createScenarioTestItemsFromFeatureFile(wkspSettings: WorkspaceSettings, testData: TestData,
    controller: vscode.TestController, item: vscode.TestItem, caller: string) {
    if (!item.uri)
      throw new Error("missing test item uri");
    if (!isFeatureFile(item.uri))
      throw new Error(`${item.uri.path} is not a feature file`);

    const content = await getContentFromFilesystem(item.uri);
    item.error = undefined;

    const featureFileWkspRelativePath = vscode.workspace.asRelativePath(item.uri, false);
    const featureFilename = item.uri.path.split('/').pop();
    if (featureFilename === undefined)
      throw new Error("featureFilename is undefined");

    const thisGeneration = generationCounter++;
    const ancestors: { item: vscode.TestItem, children: vscode.TestItem[] }[] = [];
    this.didResolve = true;

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

    const onScenarioLine = (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => {
      const parent = ancestors[ancestors.length - 1];

      const data = new Scenario(featureFilename, featureFileWkspRelativePath, featureName, scenarioName, thisGeneration, isOutline, fastSkip);
      if (!item.uri)
        throw new WkspError(`no uri for item ${item.id}`, wkspSettings.uri);
      const id = `${uriMatchString(item.uri)}/${data.getLabel()}`;
      const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
      testData.set(tcase, data);
      tcase.range = range;
      parent.item.label = featureName;
      parent.children.push(tcase);
      diagLog(`created child test item scenario ${tcase.id} from ${item.uri.path}`);
    }

    const onFeatureLine = (range: vscode.Range) => {
      item.range = range;
      ancestors.push({ item: item, children: [] });
    }

    parseFeatureContent(wkspSettings, item.uri, item.label, content, caller, onScenarioLine, onFeatureLine);

    ascend(0); // assign children for all remaining items
  }

}

export class Feature {
  constructor(public generation: number) { }
}

export interface IScenario {
  readonly featureFileName: string;
  readonly featureFileWorkspaceRelativePath: string;
  readonly featureName: string;
  scenarioName: string;
  generation: number;
  readonly isOutline: boolean;
  readonly fastSkipTag: boolean;
  getLabel(): string;
}

export class Scenario implements IScenario {
  public result: string | undefined;
  constructor(
    public readonly featureFileName: string,
    public readonly featureFileWorkspaceRelativePath: string,
    public readonly featureName: string,
    public scenarioName: string,
    public generation: number,
    public readonly isOutline: boolean,
    public readonly fastSkipTag: boolean,
  ) { }

  getLabel() {
    return `${this.scenarioName}`;
  }
}


