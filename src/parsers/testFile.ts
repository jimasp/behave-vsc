import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { uriId, isFeatureFile } from '../common/helpers';
import { ProjectSettings } from "../config/settings";
import { xRayLog } from '../common/logger';

let generationCounter = 0;
export type BehaveTestData = TestFile | Scenario;
export type TestData = WeakMap<vscode.TestItem, BehaveTestData>;


export class TestFile {
  public didResolve = false;

  public async createScenarioTestItemsFromFeatureFileContent(ps: ProjectSettings, content: string, testData: TestData,
    controller: vscode.TestController, featureItem: vscode.TestItem, caller: string) {
    if (!featureItem.uri)
      throw new Error("missing test item uri");
    if (!isFeatureFile(featureItem.uri))
      throw new Error(`${featureItem.uri.path} is not a feature file`);


    const featureUri = featureItem.uri;
    const featureName = featureItem.label;
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

        const duplicateIds = new Set<string>();
        const dupes: string[] = [];
        for (let i = finished.children.length - 1; i >= 0; i--) {
          const child = finished.children[i];
          if (duplicateIds.has(child.id)) {
            if (!dupes.includes(child.label))
              dupes.push(child.label);
            finished.children.splice(i, 1);
          }
          duplicateIds.add(child.id);
        }

        if (dupes.length > 0)
          finished.item.error = `Duplicate${dupes.length > 1 ? "s" : ""}: ${dupes.join(", ")}`;

        finished.item.children.replace(finished.children);
      }
    };

    const onScenarioLine = (range: vscode.Range, scenarioName: string, isOutline: boolean) => {
      const parent = ancestors[ancestors.length - 1];
      const data = new Scenario(featureFilename, featureFileProjRelativePath, featureName, scenarioName, thisGeneration, isOutline);
      const id = `${uriId(featureUri)}/${data.getLabel()}`;
      const scenarioItem = controller.createTestItem(id, data.getLabel(), featureUri);
      testData.set(scenarioItem, data);
      scenarioItem.range = range;
      parent.item.label = featureName;
      parent.children.push(scenarioItem);
      xRayLog(`onScenarioLine: created child test item scenario ${scenarioItem.id} from ${featureUri.path}`);
    }

    const onFeatureLine = (range: vscode.Range) => {
      featureItem.range = range;
      ancestors.push({ item: featureItem, children: [] });
    }

    parseFeatureContent(ps, featureUri, content, caller, onScenarioLine, onFeatureLine);

    ascend(0); // assign children for all remaining items
  }

}


export class Scenario {
  public result: string | undefined;
  constructor(
    public readonly featureFileName: string,
    public readonly featureFileProjectRelativePath: string,
    public readonly featureName: string,
    public scenarioName: string,
    public generation: number,
    public readonly isOutline: boolean,
  ) { }

  getLabel() {
    return `${this.scenarioName}`;
  }
}




