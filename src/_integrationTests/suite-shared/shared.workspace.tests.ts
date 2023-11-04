import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { WkspParseCounts } from '../../parsers/fileParser';
import { RunProfilesSetting, StepLibrariesSetting } from '../../settings';


const defaultEnvVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };


export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }


  runTogetherWithDefaultSettings = async (wkspName: string,
    expectedWorkspaceRelativeBaseDirPath: string,
    expectedWorkspaceRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
      envVarOverrides: undefined, featuresPath: undefined,
      justMyCode: undefined, stepLibraries: undefined, runProfiles: undefined, xRay: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig,
      expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, undefined);
  }


  runTogether = async (wkspName: string, wkspRelativeFeaturesPath: string,
    expectedWorkspaceRelativeBaseDirPath: string,
    expectedWorkspaceRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig,
      expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }


  runParallel = async (wkspName: string, wkspRelativeFeaturesPath: string,
    expectedWorkspaceRelativeBaseDirPath: string,
    expectedWorkspaceRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: runProfiles, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig,
      expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }

  runDebug = async (wkspName: string, wkspRelativeFeaturesPath: string,
    expectedWorkspaceRelativeBaseDirPath: string,
    expectedWorkspaceRelativeStepsSearchPath: string,
    getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[],
    envVarOverrides: { [name: string]: string } = defaultEnvVarOverrides,
    runProfiles: RunProfilesSetting | undefined = undefined,
    selectedRunProfile = "",
    stepLibraries: StepLibrariesSetting | undefined = undefined,
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: undefined, xRay: true
    });

    // NOTE - if this fails, try removing all breakpoints in both vscode instances 
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspName, testConfig,
      expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
      getExpectedCountsFunc, getExpectedResultsFunc, runProfiles?.[selectedRunProfile]);
  }

  // runWithStepsLibrary = async (wkspName: string,
  //   expectedWorkspaceRelativeBaseDirPath: string,
  //   expectedWorkspaceRelativeStepsSearchPath: string,
  //   stepLibraries: StepLibrariesSetting,
  //   getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
  //   getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  // ) => {

  //   const testConfig = new TestWorkspaceConfig({
  //     runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
  //     envVarOverrides: undefined, featuresPath: undefined,
  //     justMyCode: undefined, stepLibraries: stepLibraries, runProfiles: undefined, xRay: undefined
  //   });

  //   console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
  //   await runAllTestsAndAssertTheResults(false, wkspName, testConfig,
  //     expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
  //     getExpectedCountsFunc, getExpectedResultsFunc);
  // }


  // runWithRunProfiles = async (wkspName: string, wkspRelativeFeaturesPath: string,
  //   expectedWorkspaceRelativeBaseDirPath: string,
  //   expectedWorkspaceRelativeStepsSearchPath: string,
  //   getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
  //   getExpectedResultsFunc: (wkspUri: vscode.Uri, config: Configuration) => TestResult[],
  //   envVarOverrides: { [name: string]: string },
  //   runProfiles: RunProfilesSetting,
  //   runProfileTagExpression: string,
  //   runProfileEnvVarOverrides: { [name: string]: string }
  // ) => {

  //   const testConfig = new TestWorkspaceConfig({
  //     runParallel: false, multiRootRunWorkspacesInParallel: true,
  //     envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
  //     justMyCode: undefined, stepLibraries: undefined, runProfiles: runProfiles, xRay: true
  //   });

  //   console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
  //   await runAllTestsAndAssertTheResults(false, wkspName, testConfig,
  //     expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
  //     getExpectedCountsFunc, getExpectedResultsFunc, runProfileTagExpression, runProfileEnvVarOverrides);
  // }

  // runDebugWithRunProfiles = async (wkspName: string, wkspRelativeFeaturesPath: string,
  //   expectedWorkspaceRelativeBaseDirPath: string,
  //   expectedWorkspaceRelativeStepsSearchPath: string,
  //   getExpectedCountsFunc: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
  //   getExpectedResultsFunc: (wskpUri: vscode.Uri, config: Configuration) => TestResult[],
  //   envVarOverrides: { [name: string]: string },
  //   runProfiles: RunProfilesSetting,
  //   runProfile
  // ) => {

  //   const testConfig = new TestWorkspaceConfig({
  //     runParallel: true, multiRootRunWorkspacesInParallel: true,
  //     envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
  //     justMyCode: undefined, stepLibraries: undefined, runProfiles: runProfiles, xRay: true
  //   });


  //   // NOTE - if this fails, try removing all breakpoints in both vscode instances 
  //   console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
  //   await runAllTestsAndAssertTheResults(true, wkspName, testConfig,
  //     expectedWorkspaceRelativeBaseDirPath, expectedWorkspaceRelativeStepsSearchPath,
  //     getExpectedCountsFunc, getExpectedResultsFunc, runProfile);
  // }


}
