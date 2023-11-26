import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };


export class ProjectRunners {
  constructor(readonly testPre: string) { }


  runTogetherWithDefaultSettings = async (options: TestRunOptions) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined, multiRootProjectsRunInParallel: undefined,
      envVarOverrides: undefined,
      justMyCode: undefined, stepLibraries: undefined, runProfiles: undefined, xRay: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options);
  }


  runTogether = async (options: TestRunOptions) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: options.runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options);
  }


  runParallel = async (options: TestRunOptions) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: options.runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, options);
  }


  runDebug = async (options: TestRunOptions) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: options.envVarOverrides || defaultEnvVarOverrides,
      justMyCode: undefined, stepLibraries: options.stepLibraries, runProfiles: undefined, xRay: true
    });

    // NOTE - if this fails, try removing all breakpoints in both vscode instances 
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, testConfig, options);
  }

}


export type TestRunOptions = {
  projName: string;
  expectedProjectRelativeBaseDirPath: string;
  expectedProjectRelativeConfigPaths: string[];
  expectedProjectRelativeFeatureFolders: string[];
  expectedProjectRelativeStepsFolders: string[];
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
  getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
  envVarOverrides?: { [name: string]: string };
  runProfiles?: RunProfilesSetting;
  selectedRunProfile?: string;
  stepLibraries?: StepLibrariesSetting;
}

// export class TestRunOptions {
//   public readonly projName: string;
//   public readonly expectedProjectRelativeBaseDirPath: string;
//   public readonly expectedProjectRelativeConfigPaths: string[];
//   public readonly expectedProjectRelativeFeatureFolders: string[];
//   public readonly expectedProjectRelativeStepsFolders: string[];
//   public readonly getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
//   public readonly getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
//   public readonly envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides;
//   public readonly runProfiles: RunProfilesSetting | undefined;
//   public readonly selectedRunProfile: string;
//   public readonly stepLibraries: StepLibrariesSetting | undefined;
//   constructor(params: TestRunOptionsParams) {
//     this.projName = params.projName;
//     this.expectedProjectRelativeBaseDirPath = params.expectedProjectRelativeBaseDirPath;
//     this.expectedProjectRelativeConfigPaths = params.expectedProjectRelativeConfigPaths;
//     this.expectedProjectRelativeFeatureFolders = params.expectedProjectRelativeFeatureFolders;
//     this.expectedProjectRelativeStepsFolders = params.expectedProjectRelativeStepsFolders;
//     this.getExpectedCountsFunc = params.getExpectedCountsFunc;
//     this.getExpectedResultsFunc = params.getExpectedResultsFunc;
//     this.envVarOverrides = params.envVarOverrides || defaultEnvVarOverrides;
//     this.runProfiles = params.runProfiles;
//     this.selectedRunProfile = params.selectedRunProfile || "";
//     this.stepLibraries = params.stepLibraries;
//   }
// }

