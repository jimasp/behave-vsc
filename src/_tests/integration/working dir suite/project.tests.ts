import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common"
import { behaveIniFullPathsSetting, behaveIniWithRelPathsSetting, expectationsWithBehaveIni, expectationsWithoutBehaveIni, wsConfig, wsParallelConfig } from "./config";



suite(`working dir suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("working dir");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectationsWithoutBehaveIni));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectationsWithoutBehaveIni));

  test("runFeatureSet", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noRunOptions, expectationsWithoutBehaveIni));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noRunOptions, expectationsWithoutBehaveIni));

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectationsWithoutBehaveIni, true));

  test("runFeatureSet (execFriendlyCmd)", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noRunOptions, expectationsWithoutBehaveIni, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noRunOptions, expectationsWithoutBehaveIni, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAll (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni, true));

  test("runAll - with behave.ini paths as relative path (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIniWithRelPathsSetting, noRunOptions, expectationsWithBehaveIni, true));

  test("runAll - with behave.ini paths as full path (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIniFullPathsSetting, noRunOptions, expectationsWithBehaveIni, true));

  test("runAll - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsParallelConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni, true));

});

