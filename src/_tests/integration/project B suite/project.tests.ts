import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations, wsConfigParallel, behaveIni } from "./defaults";

suite(`project B suite`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, emptyBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature - parallel", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noRunOptions, expectations));

  test("runFeatureSet", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfigParallel, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noRunOptions, expectations));

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noRunOptions, expectations, true));

  test("runFeatureSet (execFriendlyCmd)", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noRunOptions, expectations, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(wsConfigParallel, noRunOptions, expectations, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noRunOptions, expectations, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAl (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfig, emptyBehaveIni, noRunOptions, expectations, true));

  test("runAll - with behave.ini (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations, true));

  test("runAll - parallel (execFriendlyCmd)", async () =>
    await testProjectRunner.runAll(wsConfigParallel, emptyBehaveIni, noRunOptions, expectations, true));


});

