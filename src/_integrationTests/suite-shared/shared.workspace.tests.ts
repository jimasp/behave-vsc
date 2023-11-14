import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };


export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }


  runTogetherWithDefaultSettings = async (projName: string,
    expectedProjectRelativeBaseDirPath: string,
    expectedProjectRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
    getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined, multiRootProjectsRunInParallel: undefined,
      envVarOverrides: undefined, featuresPath: undefined,
      justMyCode: undefined, stepLibraries: undefined, runProfiles: undefined, xRay: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, projName, testConfig,
      expectedProjectRelativeBaseDirPath, expectedProjectRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, undefined);
  }


  runTogether = async (projName: string, projRelativeFeaturesPath: string,
    expectedProjectRelativeBaseDirPath: string,
    expectedProjectRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
    getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false, multiRootProjectsRunInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: projRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, projName, testConfig,
      expectedProjectRelativeBaseDirPath, expectedProjectRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }


  runParallel = async (projName: string, projRelativeFeaturesPath: string,
    expectedProjectRelativeBaseDirPath: string,
    expectedProjectRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
    getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: projRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, projName, testConfig,
      expectedProjectRelativeBaseDirPath, expectedProjectRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }

  runDebug = async (projName: string, projRelativeFeaturesPath: string,
    expectedProjectRelativeBaseDirPath: string,
    expectedProjectRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts,
    getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootProjectsRunInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: projRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: undefined, xRay: true
    });

    // NOTE - if this fails, try removing all breakpoints in both vscode instances 
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, projName, testConfig,
      expectedProjectRelativeBaseDirPath, expectedProjectRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }


}
