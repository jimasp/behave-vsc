import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { behaveIni, expectations } from "./defaults";


suite(`simple suite: nonMulti`, () => {
  const testProjectRunner = new TestProjectRunner("simple");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

  test("debugScenariosSubSetForEachFeature", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations));

  test("runAll - execFriendlyCmd", async () =>
    await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAll - execFriendlyCmd with behave.ini", async () =>
    await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd - runParallel", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noRunOptions, expectations, true));

});


