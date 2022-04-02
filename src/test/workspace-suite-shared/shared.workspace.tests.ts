import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { ExtensionConfiguration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';

const envVarList = "  'some_var' : 'double qu\"oted',  'some_var2':  'single qu\\'oted', 'empty_var'  :'', 'space_var': ' '  ";
const envVarList2 = "'some_var':'double qu\"oted','some_var2':'single qu\\'oted', 'empty_var':'', 'space_var': ' '";
const fastSkipList = "  @fast-skip-me,  @fast-skip-me-too, ";
const fastSkipList2 = "@fast-skip-me,@fast-skip-me-too";
const featuresPath = "behave_tests/some_tests";

const testPre = "runHandler should return expected results for example-project-worspace-1 with configuration:";


export class SharedWorkspaceTests {
  constructor(readonly workspaceNum: number) { }
  private readonly testPre = `runHandler should return expected results for example-project-worspace-${this.workspaceNum} with configuration`;

  wsTest1 = async (getExpectedResults: (debug: boolean, config: ExtensionConfiguration) => TestResult[]) => {
    console.log(`${testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(false, true, fastSkipList, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
  }

  wsTest2 = async (getExpectedResults: (debug: boolean, config: ExtensionConfiguration) => TestResult[]) => {
    console.log(`${testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList2}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(false, false, fastSkipList2, envVarList2, featuresPath);
    await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
  }

  wsTest3 = async (getExpectedResults: (debug: boolean, config: ExtensionConfiguration) => TestResult[]) => {
    console.log(`${testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    const testConfig = new TestWorkspaceConfig(true, false, fastSkipList2, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(false, testConfig, getExpectedResults);
  }

  wsTest4 = async (getExpectedResults: (debug: boolean, config: ExtensionConfiguration) => TestResult[]) => {
    console.log(`${testPre}: { runParallel: false, runAllAsOne: true, fastSkipList: '${fastSkipList}', ` +
      `envVarList: '${envVarList}', featuresPath: '${featuresPath}' }`);

    // NOTE - if this fails, try removing all breakpoints in both environments
    const testConfig = new TestWorkspaceConfig(false, false, fastSkipList, envVarList, featuresPath);
    await runAllTestsAndAssertTheResults(true, testConfig, getExpectedResults);
  }

}
