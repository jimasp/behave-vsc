import { TestProjectRunner } from "../_runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { behaveIni, expectations, wsConfig } from "./config";



suite(`higher steps folder suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  test("runProjectASelections", async () =>
    await testProjectRunner.runProjectASelectionSubSets(wsConfig, behaveIni, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfig, behaveIni, noRunOptions, expectations));

  test("runSubsetOfFeaturesForEachFolder", async () =>
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, behaveIni, noRunOptions, expectations, true));
});

