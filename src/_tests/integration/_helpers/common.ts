import * as vscode from 'vscode';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../../config/configuration';
import { ProjParseCounts } from '../../../parsers/fileParser';

export type RunOptions = {
  selectedRunProfile?: string
}

export type Expectations = {
  expectedProjectRelativeWorkingDirPath?: string;
  expectedProjectRelativeBaseDirPath: string;
  expectedProjectRelativeFeatureFolders: string[];
  expectedProjectRelativeStepsFolders: string[];
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
  getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
}

export type TestBehaveIni = {
  content: string | undefined;
}

export const noBehaveIni: TestBehaveIni = {
  content: undefined
}

export const noRunOptions: RunOptions = {
  selectedRunProfile: undefined
}

// equivalent to no config file, except xRay = true for debug purposes
export const noConfig = new TestWorkspaceConfig({
  xRay: true
});

export const parallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  xRay: true
});


interface ITestResult {
  test_id: string | undefined;
  test_uri: string | undefined;
  test_parent: string | undefined;
  test_children: string | undefined;
  test_description: string | undefined;
  test_error: string | undefined;
  test_label: string;
  scenario_isOutline: boolean;
  scenario_getLabel: string;
  scenario_featureName: string;
  scenario_featureFileRelativePath: string | undefined;
  scenario_scenarioName: string;
  scenario_result: string | undefined;
}


export class TestResult implements ITestResult {
  test_id: string | undefined;
  test_uri: string | undefined;
  test_parent: string | undefined;
  test_children: string | undefined;
  test_description: string | undefined;
  test_error: string | undefined;
  test_label!: string;
  scenario_isOutline!: boolean;
  scenario_getLabel!: string;
  scenario_featureName!: string;
  scenario_featureFileRelativePath!: string;
  scenario_scenarioName!: string;
  scenario_result: string | undefined;
  constructor(testResult: ITestResult) {
    Object.assign(this, testResult);
  }
}

interface TestGlobal {
  testGlobalSettings: TestGlobalSettings;
}

class TestGlobalSettings {
  // do not use testGlobals in non-test code.
  // non-test code should not reference test code because:
  // a) it's not clean, and
  // b) we want to optimise our distributed compilation
  public multiRootTest: boolean;
  public debuggerAttached: boolean;
  constructor() {
    this.multiRootTest = false;
    this.debuggerAttached = false;
  }
}

declare const global: TestGlobal;
global.testGlobalSettings = new TestGlobalSettings();

export const testGlobals: TestGlobalSettings = global.testGlobalSettings;