import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { ExtensionConfiguration } from '../../Configuration';
import { TestResult } from './expectedResults.helpers';

const envVarList = "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ";
const envVarList2 = "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '";
const fastSkipList = "  @fast-skip-me,  @fast-skip-me-too, ";
const fastSkipList2 = "@fast-skip-me,@fast-skip-me-too";



export class SharedWorkspaceTests {
  constructor(readonly workspaceNum: number) { }
  private readonly testPre = `runHandler should return expected results for example-project-workspace-${this.workspaceNum} with configuration`;


  runAllAsOne = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedResults: (debug: boolean, wkspUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {
    console.log(`${this.testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(false, true, fastSkipList, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(wkspUri, false, testConfig, getExpectedResults);
  }

  runOneByOne = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {
    console.log(`${this.testPre}: { runParallel: false, runAllAsOne: false, fastSkipList: '${fastSkipList2}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(false, false, fastSkipList2, envVarList2, featuresPath);
    await runAllTestsAndAssertTheResults(wkspUri, false, testConfig, getExpectedResults);
  }

  runParallel = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {
    console.log(`${this.testPre}: { runParallel: true, runAllAsOne: false, fastSkipList: '${fastSkipList2}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(true, false, fastSkipList2, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(wkspUri, false, testConfig, getExpectedResults);
  }

  runDebug = async (wkspUri: vscode.Uri, featuresPath: string,
    getExpectedResults: (debug: boolean, wskpUri: vscode.Uri, config: ExtensionConfiguration) => TestResult[]
  ) => {
    console.log(`${this.testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    // NOTE - if this fails, try removing all breakpoints in both environments
    const testConfig = new TestWorkspaceConfig(false, true, fastSkipList, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(wkspUri, true, testConfig, getExpectedResults);
  }

}
