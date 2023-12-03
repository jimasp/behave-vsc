import * as vscode from 'vscode';
import { runAllTestsAndAssertTheResults } from './extension.test.helpers';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { Configuration } from '../../configuration';
import { TestResult } from './expectedResults.helpers';
import { ProjParseCounts } from '../../parsers/fileParser';


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


export const noRunOptions: RunOptions = {
  selectedRunProfile: undefined
}

// equivalent to no config file, except xRay = true for debug purposes
export const noConfig = new TestWorkspaceConfig({
  xRay: true
});

export const parallelConfig = new TestWorkspaceConfig({
  runParallel: true,
  xRay: true
});



export class TestWorkspaceRunners {
  constructor(readonly projName: string) { }

  runAll = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllTestsAndAssertTheResults(this.projName, false, wsConfig, runOptions, expectations);
  }

  // runAllNoConfig = async (expectations: Expectations) => {
  //   console.log(`runAllNoConfig ${this.projName}: no config`);
  //   await runAllTestsAndAssertTheResults(this.projName, false, noConfig, noRunOptions, expectations);
  // }

  // runAllParallelNoConfig = async (expectations: Expectations) => {
  //   console.log(`runAllParallelNoConfig ${this.projName}: no config`);
  //   await runAllTestsAndAssertTheResults(this.projName, false, noConfigParallel, noRunOptions, expectations);
  // }

  debugAll = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runAllTestsAndAssertTheResults(this.projName, true, wsConfig, runOptions, expectations);
  }

  // debugAllNoConfig = async (expectations: Expectations) => {
  //   console.log(`debugAllNoConfig ${this.projName}: no config`);
  //   // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
  //   await runAllTestsAndAssertTheResults(this.projName, true, noConfig, noRunOptions, expectations);
  // }

}


