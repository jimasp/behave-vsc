import { runProject } from './runProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { runPipedScenarios } from './runPipedScenarios';
import { Expectations, RunOptions } from '../common';
import { runPipedFeatures } from './runPipedFeatures';




export class TestProjectRunner {
  constructor(readonly projName: string) { }

  runAll = async (wsConfig: TestWorkspaceConfig, behaveIniContent: string, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runProject(this.projName, false, wsConfig, behaveIniContent, runOptions, expectations, execFriendlyCmd);
  }

  debugAll = async (wsConfig: TestWorkspaceConfig, behaveConfig: string, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(wsConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runProject(this.projName, true, wsConfig, behaveConfig, runOptions, expectations, execFriendlyCmd);
  }

  runFeatureSet = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runFeatureSet ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runPipedFeatures(this.projName, false, wsConfig, runOptions, expectations, execFriendlyCmd);
  }

  runSubsetOfScenariosForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runPipedScenarios(this.projName, false, wsConfig, runOptions, expectations, execFriendlyCmd);
  }

  debugSubsetOfScenariosForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`debugSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runPipedScenarios(this.projName, true, wsConfig, runOptions, expectations, execFriendlyCmd);
  }
}


