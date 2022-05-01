import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { ExtensionConfiguration } from '../../Configuration';
import { TestResult } from './expectedResults.helpers';
import { ParseCounts } from '../../FileParser';

const envVarList = "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ";
const envVarList2 = "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '";
const fastSkipList = "  @fast-skip-me,  @fast-skip-me-too, ";
const fastSkipList2 = "@fast-skip-me,@fast-skip-me-too";


export class SharedWorkspaceTests {
  constructor(readonly workspaceNum: number) { }
  private readonly testPre = `runHandler should return expected results for example-project-workspace-${this.workspaceNum} with configuration`;

  runAllAsOne = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: true, runParallel: false, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: featuresPath,
      alwaysShowOutput: false, justMyCode: false, showConfigurationWarnings: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspUri, testConfig, getExpectedCounts, getExpectedResults);
  }

  runOneByOne = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: false, runWorkspacesInParallel: true,
      envVarList: envVarList2, fastSkipList: fastSkipList2, featuresPath: featuresPath,
      alwaysShowOutput: false, justMyCode: false, showConfigurationWarnings: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspUri, testConfig, getExpectedCounts, getExpectedResults);
  }

  runParallel = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList2, featuresPath: featuresPath,
      alwaysShowOutput: false, justMyCode: false, showConfigurationWarnings: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspUri, testConfig, getExpectedCounts, getExpectedResults);
  }

  runDebug = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: featuresPath,
      alwaysShowOutput: false, justMyCode: false, showConfigurationWarnings: undefined
    });


    // NOTE - if this fails, try removing all breakpoints in both environments
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspUri, testConfig, getExpectedCounts, getExpectedResults);
  }

}
