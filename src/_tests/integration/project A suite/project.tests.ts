import { TestProjectRunner } from "../_common/projectRunner";
import { noRunOptions } from "../_common/types";
import { behaveIni, expectations, wsConfig } from "./config";
import { selections } from "./selections";



suite(`higher steps folder suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfig, behaveIni, noRunOptions, expectations));

  test("runSubsetOfFeaturesForEachFolder", async () =>
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, behaveIni, noRunOptions, expectations, true));

  // scenarios subset test is useful in project A due to the special chars/piped special chars scenarios
  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, behaveIni, noRunOptions, expectations, true));

  // selection sets are currently only tested here (so don't delete this)
  test("runSelectionSets", async () =>
    await testProjectRunner.runSelectionSets(wsConfig, behaveIni, expectations, selections));
});

