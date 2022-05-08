import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../Configuration';
import { TestResult } from './expectedResults.helpers';
import { ParseCounts } from '../../FileParser';

const envVarList = "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ";
const envVarList2 = "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '";
const fastSkipList = "  @fast-skip-me,  @fast-skip-me-too, ";
const fastSkipList2 = "@fast-skip-me,@fast-skip-me-too";


export class SharedWorkspaceTests {
  constructor(readonly testPre: string) { }

  runAllAsOne = async (wkspName: string, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: true, runParallel: false, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: featuresPath,
      alwaysShowOutput: true, justMyCode: undefined, showConfigurationWarnings: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }


  runParallel = async (wkspName: string, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList2, featuresPath: featuresPath,
      alwaysShowOutput: undefined, justMyCode: true, showConfigurationWarnings: undefined
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runOneByOne = async (wkspName: string, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: false, runWorkspacesInParallel: true,
      envVarList: envVarList2, fastSkipList: fastSkipList2, featuresPath: featuresPath,
      alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: true
    });

    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

  runDebug = async (wkspName: string, featuresPath: string,
    getExpectedCounts: () => ParseCounts,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: Configuration) => TestResult[]
  ) => {

    const testConfig = new TestWorkspaceConfig({
      runAllAsOne: false, runParallel: true, runWorkspacesInParallel: true,
      envVarList: envVarList, fastSkipList: fastSkipList, featuresPath: featuresPath,
      alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: undefined
    });


    // NOTE - if this fails, try removing all breakpoints in both environments
    console.log(`${this.testPre}: ${JSON.stringify(testConfig)}`);
    await runAllTestsAndAssertTheResults(true, wkspName, testConfig, getExpectedCounts, getExpectedResults);
  }

}
