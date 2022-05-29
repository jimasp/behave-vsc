import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../Configuration';
import { TestResult } from './expectedResults.helpers';
import { ParseCounts } from '../../FileParser';


const envVarList = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USER": "bob-163487" };
const fastSkipList = ["@fast-skip-me", "@fast-skip-me-too"];



export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }

  runAllAsOne = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
    getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: true, runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: undefined, logDiagnostics: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }


  runParallel = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: true, showSettingsWarnings: undefined, logDiagnostics: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runOneByOne = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: true, logDiagnostics: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runDebug = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, showSettingsWarnings: undefined, logDiagnostics: true
    });


    // NOTE - if this fails, try removing all breakpoints in both environments
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

}
