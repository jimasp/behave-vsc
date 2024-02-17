import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { behaveIni, expectations, wsConfig } from "./defaults";


suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  // test("debugAll", async () =>
  //   await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  // test("debugFeaturesScenariosSubSets", async () =>
  //   await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  // test("runAll - execFriendlyCmd", async () =>
  //   await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations, true));

  // test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
  //   await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations, true));

});

