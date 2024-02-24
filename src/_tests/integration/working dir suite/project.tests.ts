import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common"
import {
  wsConfig, wsParallelConfig,
  behaveIniWith3AbsPathsSetting, behaveIniWith2RelPathsSetting, behaveIniWith3RelPathsSetting, expectationsWith2RelPathsBehaveIni,
  expectations, expectationsWith3RelPathsBehaveIni, expectationsWith3AbsPathsBehaveIni
} from "./config";



suite(`working dir suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("working dir");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runSubsetOfScenariosForEachFeature", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runFeatureSet", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runAllFolders", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noBehaveIni, noRunOptions, expectations));

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runScenariosSubSetForEachFeature (execFriendlyCmd)", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runFeatureSet (execFriendlyCmd)", async () =>
    await testProjectRunner.runFeatureSet(wsConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAllFolders (execFriendlyCmd)", async () =>
    await testProjectRunner.runAllFolders(wsConfig, noBehaveIni, noRunOptions, expectations, true));

  // same tests run in multi.test.ts but with execFriendlyCmd=true:

  test("runAll", async () =>
    await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runAll - parallel", async () =>
    await testProjectRunner.runAll(wsParallelConfig, noBehaveIni, noRunOptions, expectations, true));

  test("runAll - with behave.ini with 2 relative paths", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIniWith2RelPathsSetting, noRunOptions, expectationsWith2RelPathsBehaveIni, true));

  test("runAll - with behave.ini with 3 relative paths", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIniWith3RelPathsSetting, noRunOptions, expectationsWith3RelPathsBehaveIni, true));

  test("runAll - with behave.ini with 3 absolute paths", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIniWith3AbsPathsSetting, noRunOptions, expectationsWith3AbsPathsBehaveIni, true));

});

