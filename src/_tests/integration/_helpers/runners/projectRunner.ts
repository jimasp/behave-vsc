import * as vscode from 'vscode';
import { runAllProjectAndAssertTheResults } from './runAllProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { Configuration } from '../../../../config/configuration';
import { TestResult } from './assertions';
import { ProjParseCounts } from "../../../../parsers/fileParser";
import { runAllProjectScenariosIndividuallyAndAssertTheResults } from './runAllProjectScenarios';
import { runAllProjectFeaturesIndividuallyAndAssertTheResults } from './runAllProjectFeatures';


export type RunOptions = {
  selectedRunProfile?: string
}

export type Expectations = {
  expectedProjectRelativeWorkingDirPath?: string;
  expectedProjectRelativeBaseDirPath: string;
  expectedProjectRelativeConfigPaths: string[];
  expectedProjectRelativeFeatureFolders: string[];
  expectedProjectRelativeStepsFolders: string[];
  getExpectedCountsFunc: (projUri: vscode.Uri, config: Configuration) => ProjParseCounts;
  getExpectedResultsFunc: (projUri: vscode.Uri, config: Configuration) => TestResult[];
}

export const noBehaveIni = "";

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



export class TestProjectRunner {
  constructor(readonly projName: string) { }

  runAll = async (wsConfig: TestWorkspaceConfig, behaveIniContent: string, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectAndAssertTheResults(this.projName, false, wsConfig, behaveIniContent, runOptions, expectations);
  }

  debugAll = async (wsConfig: TestWorkspaceConfig, behaveConfig: string, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runAllProjectAndAssertTheResults(this.projName, true, wsConfig, behaveConfig, runOptions, expectations);
  }

  runFeatures = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectFeaturesIndividuallyAndAssertTheResults(this.projName, false, wsConfig, runOptions, expectations);
  }

  debugFeatures = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectFeaturesIndividuallyAndAssertTheResults(this.projName, true, wsConfig, runOptions, expectations);
  }

  runScenarios = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runScenarios ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectScenariosIndividuallyAndAssertTheResults(this.projName, false, wsConfig, runOptions, expectations);
  }

  debugScenarios = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugScenarios ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectScenariosIndividuallyAndAssertTheResults(this.projName, true, wsConfig, runOptions, expectations);
  }

}


