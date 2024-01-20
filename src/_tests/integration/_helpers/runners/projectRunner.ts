import { runProject } from './runProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { runPipedScenariosOnly } from './runPipedScenarios';
import { Expectations, RunOptions } from '../common';




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

  runSubsetOfScenariosForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runPipedScenariosOnly(this.projName, false, wsConfig, runOptions, expectations, execFriendlyCmd);
  }

  debugSubsetOfScenariosForEachFeature = async (wsConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`debugFeatures ${this.projName}: ${JSON.stringify(wsConfig)}`);
    await runPipedScenariosOnly(this.projName, true, wsConfig, runOptions, expectations, execFriendlyCmd);
  }
}


