import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };

export type TestRunOptions = {
  projName: string;
  envVarOverrides?: { [name: string]: string };
  runProfiles?: RunProfilesSetting;
  selectedRunProfile?: string;
  stepLibraries?: StepLibrariesSetting;
}

export type Expectations = {
  expectedProjectRelativeBaseDirPath: string;
  expectedProjectRelativeConfigPaths: string[];
  expectedProjectRelativeFeatureFolders: string[];
  expectedProjectRelativeStepsFolders: string[];
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
  getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
}

export class ProjectRunners {
  constructor(readonly testPre: string) { }


  runTogetherWithDefaultSettings = async (options: TestRunOptions, expectations: Expectations) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined, multiRootProjectsRunInParallel: undefined,
      envVarOverrides: undefined,
      justMyCode: undefined, stepLibraries: undefined, runProfiles: undefined, xRay: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options, expectations);
  }


  runTogether = async (options: TestRunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: options.runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options, expectations);
  }


  runParallel = async (options: TestRunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: options.runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options, expectations);
  }


  runDebug = async (options: TestRunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: undefined, xRay: true
    });

    // NOTE - if this fails, try removing all breakpoints in both vscode instances 
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, testConfig, options, expectations);
  }

}


