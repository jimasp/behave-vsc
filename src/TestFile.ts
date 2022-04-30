import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { runOrDebugBehaveScenario } from './behaveRunOrDebug';
import { QueueItem } from './extension';
import { getContentFromFilesystem, isFeatureFile } from './helpers';
import config from "./Configuration";
import { WorkspaceSettings } from "./WorkspaceSettings";

let generationCounter = 0;
type BehaveTestData = TestFile | Feature | Scenario;
export const testData = new WeakMap<vscode.TestItem, BehaveTestData>();



export class TestFile {
  public didResolve = false;

  public async updateScenarioTestItemsFromFeatureFileOnDisk(wkspSettings: WorkspaceSettings, controller: vscode.TestController, item: vscode.TestItem,
    caller: string) {
    try {
      if (!item.uri)
        throw new Error("missing test item uri");
      if (!isFeatureFile(item.uri))
        throw new Error(`${item.uri.path} is not a feature file`);

      const content = await getContentFromFilesystem(item.uri);
      item.error = undefined;
      this.createScenarioTestItemsFromFeatureFileContents(wkspSettings, item.uri.path, controller, content, item, caller);
    }
    catch (e: unknown) {
      item.error = (e as Error).stack;
      config.logger.logError(e);
    }
  }


  public createScenarioTestItemsFromFeatureFileContents(wkspSettings: WorkspaceSettings, featureFilePath: string, controller: vscode.TestController,
    content: string, item: vscode.TestItem, caller: string) {

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
          if (err.includes("duplicate")) {
            const n = err.lastIndexOf('/');
            const scen = err.substring(n);
            err = err.replace(scen, `. Duplicate scenario: "${scen.slice(1)}".`);
            config.logger.logError(err);
          }
          else
            throw e;
        }
      }
    };

    const onScenarioLine = (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => {
      const parent = ancestors[ancestors.length - 1];
      if (item.uri === undefined)
        throw new Error("testitem uri is undefined");
      const data = new Scenario(vscode.workspace.asRelativePath(item.uri, false), featureName, scenarioName, thisGeneration, isOutline, fastSkip);
      const id = `${item.uri}/${data.getLabel()}`;
      const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
      testData.set(tcase, data);
      tcase.range = range;
      parent.item.label = featureName;
      parent.children.push(tcase);
      console.log("created child test item " + tcase.id + "from " + featureFilePath);
    }

    const onFeatureLine = (range: vscode.Range) => {
      item.range = range;
      ancestors.push({ item: item, children: [] });
    }

    parseFeatureContent(wkspSettings, featureFilePath, item.label, content, caller, onScenarioLine, onFeatureLine);

    ascend(0); // assign children for all remaining items
  }

}

export class Feature {
  constructor(public generation: number) { }
}

export class Scenario {
  public result: string | undefined;
  constructor(
    public readonly featureFileWorkspaceRelativePath: string,
    public readonly featureName: string,
    public scenarioName: string,
    public generation: number,
    public readonly isOutline: boolean,
    public readonly fastSkip: boolean,
  ) { }

  getLabel() {
    return `${this.scenarioName}`;
  }


  async runOrDebug(wkspSettings: WorkspaceSettings, debug: boolean, run: vscode.TestRun, queueItem: QueueItem,
    cancellation: vscode.CancellationToken): Promise<void> {

    await runOrDebugBehaveScenario(wkspSettings, run, queueItem, debug, cancellation);
  }

}


