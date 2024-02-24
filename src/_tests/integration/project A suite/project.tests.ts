import { TestProjectRunner } from "../_runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { behaveIni, expectations, wsConfig } from "./config";



suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("runProjectASelections", async () =>
    await testProjectRunner.runProjectASelectionSubSets(wsConfig, behaveIni, expectations));

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, behaveIni, noRunOptions, expectations));

  test("runAll - execFriendlyCmd", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, behaveIni, noRunOptions, expectations, true));

});

