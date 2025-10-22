import * as vscode from 'vscode';
import { parseFeatureContent } from './featureParser';
import { uriId, isFeatureFile } from '../common';
import { config } from "../configuration";
import { WorkspaceSettings } from "../settings";
import { diagLog } from '../logger';

let generationCounter = 0;
export type BehaveTestData = TestFile | Scenario;
export type TestData = WeakMap<vscode.TestItem, BehaveTestData>;


export class TestFile {
  public didResolve = false;

  private addDuplicateScenarioDiagnostics(featureUri: vscode.Uri, scenarioRanges: Map<string, vscode.Range[]>) {
    const existingDiagnostics = config.diagnostics.get(featureUri) || [];
    const newDiagnostics = [...existingDiagnostics];

    for (const [scenarioName, ranges] of scenarioRanges) {
      if (ranges.length > 1) {
        diagLog(`Duplicate scenario detected: "${scenarioName}"`);

        for (const range of ranges) {
          const diagnostic = new vscode.Diagnostic(
            range,
            `Duplicate scenario name: "${scenarioName}". Each scenario in a feature file must have a unique name.`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.code = "duplicate-scenario";
          diagnostic.source = "behave-vsc";
          newDiagnostics.push(diagnostic);
        }
      }
    }
    config.diagnostics.set(featureUri, newDiagnostics);
  }

  public async createScenarioTestItemsFromFeatureFileContent(wkspSettings: WorkspaceSettings, content: string, testData: TestData,
    controller: vscode.TestController, item: vscode.TestItem, caller: string) {
    if (!item.uri)
      throw new Error("missing test item uri");
    if (!isFeatureFile(item.uri))
      throw new Error(`${item.uri.path} is not a feature file`);

    item.error = undefined;

    const featureUri = item.uri;
    const featureName = item.label;
    const featureFileWkspRelativePath = vscode.workspace.asRelativePath(featureUri, false);
    const featureFilename = featureUri.path.split('/').pop();
    if (featureFilename === undefined)
      throw new Error("featureFilename is undefined");

    const thisGeneration = generationCounter++;
    const ancestors: { item: vscode.TestItem, children: vscode.TestItem[] }[] = [];
    const scenarioRanges = new Map<string, vscode.Range[]>();
    this.didResolve = true;

    // Clear any existing diagnostics for this file
    const existingDiagnostics = config.diagnostics.get(featureUri) || [];
    const nonDuplicateDiagnostics = existingDiagnostics.filter(d => d.code !== "duplicate-scenario");
    config.diagnostics.set(featureUri, nonDuplicateDiagnostics);

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
            this.addDuplicateScenarioDiagnostics(featureUri, scenarioRanges);
          }
          else
            throw e;
        }
      }
    };

    const onScenarioLine = (range: vscode.Range, scenarioName: string, isOutline: boolean) => {
      const parent = ancestors[ancestors.length - 1];

      // Track scenario name and range for duplicate detection
      const ranges = scenarioRanges.get(scenarioName) || [];
      ranges.push(range);
      scenarioRanges.set(scenarioName, ranges);

      const data = new Scenario(featureFilename, featureFileWkspRelativePath, featureName, scenarioName, thisGeneration, isOutline);
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

    parseFeatureContent(wkspSettings, featureUri, content, caller, onScenarioLine, onFeatureLine);

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




