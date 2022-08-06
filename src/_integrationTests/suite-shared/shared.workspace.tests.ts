import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { WkspParseCounts } from '../../parsing/fileParser';


const envVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };
const fastSkipTags = ["@fast-skip-me", "@fast-skip-me-too"];



export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }

  runAllAsOne = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: true, runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, fastSkipTags: fastSkipTags, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: undefined, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }


  runParallel = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, fastSkipTags: fastSkipTags, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: true, showSettingsWarnings: undefined, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runOneByOne = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, fastSkipTags: fastSkipTags, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: true, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runDebug = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, fastSkipTags: fastSkipTags, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: undefined, xRay: true
    });


    // NOTE - if this fails, try removing all breakpoints in both environments
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

}
