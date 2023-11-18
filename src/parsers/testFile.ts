import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { uriId, isFeatureFile } from '../common';
import { config } from "../configuration";
import { ProjectSettings } from "../settings";
import { diagLog } from '../logger';

let generationCounter = 0;
export type BehaveTestData = TestFile | Scenario;
export type TestData = Map<vscode.TestItem, BehaveTestData>;


export class TestFile {
  public didResolve = false;

  public async createScenarioTestItemsFromFeatureFileContent(projSettings: ProjectSettings, content: string, testData: TestData,
    controller: vscode.TestController, item: vscode.TestItem, caller: string) {
    if (!item.uri)
      throw new Error("missing test item uri");
    if (!isFeatureFile(item.uri))
      throw new Error(`${item.uri.path} is not a feature file`);

    item.error = undefined;

    const featureUri = item.uri;
    const featureName = item.label;
    const featureFileProjRelativePath = vscode.workspace.asRelativePath(featureUri, false);
    const featureFilename = featureUri.path.split('/').pop();
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
            config.logger.showWarn(err, projSettings.uri);
          }
          else
            throw e;
        }
      }
    };

    const onScenarioLine = (range: vscode.Range, scenarioName: string, isOutline: boolean) => {
      const parent = ancestors[ancestors.length - 1];

      const data = new Scenario(featureFilename, featureFileProjRelativePath, featureName, scenarioName, thisGeneration, isOutline);
      const id = `${uriId(featureUri)}/${data.getLabel()}`;
      const tcase = controller.createTestItem(id, data.getLabel(), featureUri);
      testData.set(tcase, data);
      tcase.range = range;
      parent.item.label = featureName;
      parent.children.push(tcase);
      diagLog(`created child test item scenario ${tcase.id} from ${featureUri.path}`);
    }

    const onFeatureLine = (range: vscode.Range) => {
      item.range = range;
      ancestors.push({ item: item, children: [] });
    }

    parseFeatureContent(projSettings, featureUri, content, caller, onScenarioLine, onFeatureLine);

    ascend(0); // assign children for all remaining items
  }

}


export class Scenario {
  public result: string | undefined;
  constructor(
    public readonly featureFileName: string,
    public readonly featureFileWorkspaceRelativePath: string,
    public readonly featureName: string,
    public scenarioName: string,
    public generation: number,
    public readonly isOutline: boolean,
  ) { }

  getLabel() {
    return `${this.scenarioName}`;
  }
}




