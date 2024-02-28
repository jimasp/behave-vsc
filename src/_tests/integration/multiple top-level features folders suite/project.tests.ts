import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/common";
import { behaveIni, expectations, expectationsWithBehaveIni } from "./config";



suite(`multiple top-level features folders suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("multiple top-level features folders");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

  test("runSubsetOfFeaturesForEachFolder", async () =>
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(noConfig, noBehaveIni, noRunOptions, expectations));

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runSubsetOfFeaturesForEachFolder (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(noConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(noConfig, noBehaveIni, noRunOptions, expectations, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAll - no behave.ini (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, noBehaveIni, noRunOptions, expectations));

  test("runAll - with behave.ini (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(noConfig, behaveIni, noRunOptions, expectationsWithBehaveIni));

  test("runAll - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(parallelConfig, noBehaveIni, noRunOptions, expectations));

});

