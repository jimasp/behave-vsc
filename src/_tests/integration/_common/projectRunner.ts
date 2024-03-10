import { runProject } from './runProject';
import { TestWorkspaceConfig } from './testWorkspaceConfig';
import { runScenarios } from './runScenarios';
import { TestBehaveIni, Expectations, RunOptions } from './types';
import { runPipedFeatures } from './runPipedFeatures';
import { runFolders } from './runFolders';
import { runProjectASelections } from './runProjectASelections';


// just a convenience class to make the index.ts files a little cleaner
export class TestProjectRunner {
  constructor(readonly projName: string) { }

  runAll = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false, checkFriendlyCmdLogs = true) => {
    console.log(`runAll ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runProject(this.projName, false, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd, checkFriendlyCmdLogs);
  }

  debugAll = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false, checkFriendlyCmdLogs = true) => {
    console.log(`debugAll ${this.projName}: ${JSON.stringify(twConfig)}`);
    // NOTE - if a debug run fails, try removing all breakpoints in both vscode instances     
    await runProject(this.projName, true, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd, checkFriendlyCmdLogs);
  }

  runSubsetOfFeaturesForEachFolder = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runSubsetOfFeaturesForEachFolder ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runPipedFeatures(this.projName, false, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd);
  }

  runAllFolders = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, runOptions: RunOptions, expectations: Expectations,
    execFriendlyCmd = false) => {
    console.log(`runAllFolders ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runFolders(this.projName, false, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd);
  }

  runSubsetOfScenariosForEachFeature = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni,
    runOptions: RunOptions, expectations: Expectations, execFriendlyCmd = false) => {
    console.log(`runSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runScenarios(this.projName, false, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd);
  }

  debugSubsetOfScenariosForEachFeature = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, runOptions: RunOptions,
    expectations: Expectations, execFriendlyCmd = false) => {
    console.log(`debugSubsetOfScenariosForEachFeature ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runScenarios(this.projName, true, twConfig, behaveIni, runOptions, expectations, execFriendlyCmd);
  }

  runProjectASelectionSubSets = async (twConfig: TestWorkspaceConfig, behaveIni: TestBehaveIni, expectations: Expectations) => {
    console.log(`runProjectASelectionSubSets ${this.projName}: ${JSON.stringify(twConfig)}`);
    await runProjectASelections(twConfig, behaveIni, expectations);
  }
}


