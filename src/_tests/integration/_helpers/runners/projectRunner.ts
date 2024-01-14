import { runProject } from './runProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { runFeaturesIndividually } from './runFeatures';
import { runFeaturesScenarioSubsets } from './runFeaturesScenarioSubsets';
import { Expectations, RunOptions } from '../common';




export class TestProjectRunner {
  constructor(readonly projName: string) { }

  runAll = async (wsConfig: TestWorkspaceConfig, behaveIniContent: string, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runProject(this.projName, false, wsConfig, behaveIniContent, runOptions, expectations);
  }

  debugAll = async (wsConfig: TestWorkspaceConfig, behaveConfig: string, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runProject(this.projName, true, wsConfig, behaveConfig, runOptions, expectations);
  }

  runEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runFeaturesIndividually(this.projName, false, wsConfig, runOptions, expectations);
  }

  debugEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runFeaturesIndividually(this.projName, true, wsConfig, runOptions, expectations);
  }

  runScenariosSubSetForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`runFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runFeaturesScenarioSubsets(this.projName, false, wsConfig, runOptions, expectations);
  }

  debugScenariosSubSetForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations) => {
    console.log(`debugFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runFeaturesScenarioSubsets(this.projName, true, wsConfig, runOptions, expectations);
  }
}


