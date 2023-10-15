import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { WkspParseCounts } from '../../parsers/fileParser';


const envVarOverrides = { "some_var": "double qu\"oted", "some_var2": "single qu'oted", "space_var": " ", "USERNAME": "bob-163487" };



export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }


  runDefault = async (wkspName: string,
    getExpectedCounts: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    // default = everything undefined
    const testConfig = new TestWorkspaceConfig({
      runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
      envVarOverrides: undefined, featuresPath: undefined,
      justMyCode: undefined, xRay: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }


  runTogether = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: false, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }


  runParallel = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: true, xRay: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runDebug = async (wkspName: string, wkspRelativeFeaturesPath: string,
    getExpectedCounts: (wkspUri: vscode.Uri, config: Configuration) => WkspParseCounts,
    getExpectedResults: (wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runParallel: true, multiRootRunWorkspacesInParallel: true,
      envVarOverrides: envVarOverrides, featuresPath: wkspRelativeFeaturesPath,
      justMyCode: undefined, xRay: true
    });


    // NOTE - if this fails, try removing all breakpoints in both environments
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

}
