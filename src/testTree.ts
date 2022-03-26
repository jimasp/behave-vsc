import * as vscode from 'vscode';
import { parseFeatureFile } from './featureParser';
import { runOrDebugBehaveScenario } from './runOrDebug';
import { QueueItem } from './extension';
import { getTextFileContentFromFilesystem } from './helpers';


let generationCounter = 0;


type BehaveTestData = TestFile | Feature | Scenario;
export const testData = new WeakMap<vscode.TestItem, BehaveTestData>();



export class TestFile {
  public didResolve = false;

  public async updateFromDisk(controller: vscode.TestController, item: vscode.TestItem) {
    try {
      if (!item.uri)
        throw "missing test item uri"
      const content = await getTextFileContentFromFilesystem(item.uri);
      item.error = undefined;
      this.updateFromContents(controller, content, item);
    } catch (e: unknown) {
      item.error = (e as Error).stack;
    }
  }


  public updateFromContents(controller: vscode.TestController, content: string, item: vscode.TestItem) {
    const thisGeneration = generationCounter++;
    const ancestors: { item: vscode.TestItem, children: vscode.TestItem[] }[] = [];
    this.didResolve = true;

    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop();
        if (finished === undefined)
          throw "finished is undefined"
        finished.item.children.replace(finished.children);
      }
    };

    const onScenarioLine = (range: vscode.Range, featureName: string, scenarioName: string, isOutline: boolean, fastSkip: boolean) => {
      const parent = ancestors[ancestors.length - 1];
      if (item.uri === undefined)
        throw "testitem uri is undefined"
      const data = new Scenario(vscode.workspace.asRelativePath(item.uri), featureName, scenarioName, thisGeneration, isOutline, fastSkip);
      const id = `${item.uri}/${data.getLabel()}`;
      const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
      testData.set(tcase, data);
      tcase.range = range;
      parent.item.label = featureName;
      parent.children.push(tcase);
    }

    const onFeatureLine = (range: vscode.Range) => {
      item.range = range;
      ancestors.push({ item: item, children: [] });
    }

    parseFeatureFile(item.label, content, onScenarioLine, onFeatureLine);

    ascend(0); // assign children for all remaining items
  }

}

export class Feature {
  constructor(public generation: number) { }
}

export class Scenario {
  public result: string | undefined;
  constructor(
    public readonly featureFileRelativePath: string,
    public readonly featureName: string,
    public scenarioName: string,
    public generation: number,
    public readonly isOutline: boolean,
    public readonly fastSkip: boolean,
  ) { }

  getLabel() {
    return `${this.scenarioName}`;
  }


  async runOrDebug(context: vscode.ExtensionContext, debug: boolean, run: vscode.TestRun, queueItem: QueueItem, cancellation: vscode.CancellationToken): Promise<void> {
    await runOrDebugBehaveScenario(context, run, queueItem, debug, cancellation);
  }

}


