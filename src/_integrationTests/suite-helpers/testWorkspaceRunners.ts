import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };

export type ConfigOptions = {
  envVarOverrides?: { [name: string]: string };
  runProfiles?: RunProfilesSetting;
  stepLibraries?: StepLibrariesSetting;
}

export type RunOptions = {
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
  constructor(readonly projName: string) { }


  runAllWithNoConfig = async (expectations: Expectations) => {

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

    const runOptions: RunOptions = {
      selectedRunProfile: undefined
    }

    console.log(`${this.projName}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(this.projName, false, testConfig, runOptions, expectations);
  }

  runAll = async (configOptions: ConfigOptions, runOptions: RunOptions, expectations: Expectations) => {
    const testConfig = this._createTestConfig(configOptions);
    console.log(`${this.projName}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(this.projName, false, testConfig, runOptions, expectations);
  }

  runAllParallel = async (configOptions: ConfigOptions, runOptions: RunOptions, expectations: Expectations) => {
    const testConfig = this._createTestConfig(configOptions, true);
    console.log(`${this.projName}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(this.projName, false, testConfig, runOptions, expectations);
  }

  debugAll = async (configOptions: ConfigOptions, runOptions: RunOptions, expectations: Expectations) => {
    const testConfig = this._createTestConfig(configOptions);
    console.log(`${this.projName}: ${JSON.stringify(testConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runAllTestsAndAssertTheResults(this.projName, true, testConfig, runOptions, expectations);
  }


  private _createTestConfig(cfg: ConfigOptions, runParallel = false) {
    return new TestWorkspaceConfig({
      runParallel: runParallel,
      multiRootProjectsRunInParallel: true,
      justMyCode: undefined,
      xRay: true,
      envVarOverrides: cfg.envVarOverrides || defaultEnvVarOverrides,
      stepLibraries: cfg.stepLibraries,
      runProfiles: cfg.runProfiles,
    });
  }
}


