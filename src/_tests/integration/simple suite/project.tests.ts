import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { behaveIni, expectations } from "./defaults";


suite(`simple suite: nonMulti`, () => {
  const testProjectRunner = new TestProjectRunner("simple");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, emptyBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature - parallel", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noRunOptions, expectations));

  test("runFeatureSet", async () =>
    await testProjectRunner.runFeatureSet(noConfig, noRunOptions, expectations));


  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noRunOptions, expectations, true));

  test("runFeatureSet (execFriendlyCmd)", async () =>
    await testProjectRunner.runFeatureSet(noConfig, noRunOptions, expectations, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAl (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, emptyBehaveIni, noRunOptions, expectations, true));

  test("runAll - with behave.ini (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectations, true));

  test("runAll - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(parallelConfig, emptyBehaveIni, noRunOptions, expectations, true));

});


