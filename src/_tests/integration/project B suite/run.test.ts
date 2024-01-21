import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations, wsConfigParallel } from "./defaults";

suite(`project B suite: run`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  test("runAll - execFriendlyCmd", async () =>
    await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd - runParallel", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noRunOptions, expectations, true));

});

