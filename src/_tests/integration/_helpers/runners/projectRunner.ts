import { runAllProjectAndAssertTheResults } from './runProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { runAllProjectScenariosIndividuallyAndAssertTheResults } from './runScenarios';
import { runAllProjectFeaturesIndividuallyAndAssertTheResults } from './runFeatures';
import { runAllProjectFeaturesScenarioSubsetsAndAssertTheResults } from './runFeaturesScenarioSubsets';
import { Expectations, RunOptions } from '../common';




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

  runFeaturesScenariosSubSet = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectFeaturesScenarioSubsetsAndAssertTheResults(this.projName, false, wsConfig, runOptions, expectations);
  }

  debugFeaturesScenariosSubSet = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runAllProjectFeaturesScenarioSubsetsAndAssertTheResults(this.projName, true, wsConfig, runOptions, expectations);
  }
}


