import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { expectations, behaveIni, expectationsWithBehaveIni } from "./config";



suite(`project B suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature - parallel", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

  test("runFeatureSet", async () =>
    await testProjectRunner.runFeatureSet(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(parallelConfig, noBehaveIni, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni, true));

  test("runScenariosSubSetForEachFeature - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(parallelConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runFeatureSet (execFriendlyCmd)", async () =>
    await testProjectRunner.runFeatureSet(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAllFolders - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(parallelConfig, noBehaveIni, noRunOptions, expectations, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAll (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAll - with behave.ini (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni, true));

  test("runAll - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations, true));


});

