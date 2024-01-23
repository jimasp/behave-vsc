import { runProject } from './runProject';
import { TestWorkspaceConfig } from '../testWorkspaceConfig';
import { runScenarios } from './runScenarios';
import { Expectations, RunOptions } from '../common';
import { runPipedFeatures } from './runPipedFeatures';
import { runFolders } from './runFolders';


// just a convenience class to make the index.ts files a little cleaner
export class TestProjectRunner {
  constructor(readonly projName: string) { }

  runAll = async (twConfig: TestWorkspaceConfig, behaveIniContent: string, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runProject(this.projName, false, twConfig, behaveIniContent, runOptions, expectations, execFriendlyCmd);
  }

  debugAll = async (twConfig: TestWorkspaceConfig, behaveConfig: string, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(twConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runProject(this.projName, true, twConfig, behaveConfig, runOptions, expectations, execFriendlyCmd);
  }

  runFeatureSet = async (twConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runFeatureSet ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runPipedFeatures(this.projName, false, twConfig, runOptions, expectations, execFriendlyCmd);
  }

  runEachFolder = async (twConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runEachFolder ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runFolders(this.projName, false, twConfig, runOptions, expectations, execFriendlyCmd);
  }

  runSubsetOfScenariosForEachFeature = async (twConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runScenarios(this.projName, false, twConfig, runOptions, expectations, execFriendlyCmd);
  }

  debugSubsetOfScenariosForEachFeature = async (twConfig: TestWorkspaceConfig, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`debugSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runScenarios(this.projName, true, twConfig, runOptions, expectations, execFriendlyCmd);
  }
}


