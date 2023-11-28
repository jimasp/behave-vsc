import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };

export type ConfigOptions = {
  projName: string;
  envVarOverrides?: { [name: string]: string };
  runProfiles?: RunProfilesSetting;
  stepLibraries?: StepLibrariesSetting;
}

export type RunOptions = {
  projName: string;
  selectedRunProfile?: string
}

export type Expectations = {
  expectedProjectRelativeBaseDirPath: string;
  expectedProjectRelativeConfigPaths: string[];
  expectedProjectRelativeFeatureFolders: string[];
  expectedProjectRelativeStepsFolders: string[];
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
  getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
}

export class TestWorkspaceRunners {
  constructor(readonly testPre: string) { }

  runAllWithNoConfig = async (projName: string, expectations: Expectations) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined,
      multiRootProjectsRunInParallel: undefined,
      envVarOverrides: undefined,
      justMyCode: undefined,
      stepLibraries: undefined,
      runProfiles: undefined,
      xRay: undefined
    });

    const opt: RunOptions = {
      projName: projName,
      selectedRunProfile: undefined
    }

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, opt, expectations);
  }


  runAll = async (cfg: ConfigOptions, opt: RunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false,
      multiRootProjectsRunInParallel: true,
      justMyCode: undefined,
      xRay: true,
      envVarOverrides: cfg.envVarOverrides || defaultEnvVarOverrides,
      stepLibraries: cfg.stepLibraries,
      runProfiles: cfg.runProfiles,
    });


    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, opt, expectations);
  }


  runAllParallel = async (cfg: ConfigOptions, opt: RunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true,
      multiRootProjectsRunInParallel: true,
      justMyCode: undefined,
      xRay: true,
      envVarOverrides: cfg.envVarOverrides || defaultEnvVarOverrides,
      stepLibraries: cfg.stepLibraries,
      runProfiles: cfg.runProfiles,
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, testConfig, opt, expectations);
  }


  debugAll = async (cfg: ConfigOptions, opt: RunOptions, expectations: Expectations) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, // should be ignored by debug
      multiRootProjectsRunInParallel: true,
      justMyCode: undefined,
      xRay: true,
      envVarOverrides: cfg.envVarOverrides || defaultEnvVarOverrides,
      stepLibraries: cfg.stepLibraries,
      runProfiles: undefined,
    });

    // NOTE - if this fails, try removing all breakpoints in both vscode instances 
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, testConfig, opt, expectations);
  }

}


