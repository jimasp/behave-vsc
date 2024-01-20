import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { behaveIni, expectations, wsConfig } from "./defaults";


// separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// i.e. contains test runs we specifically do NOT want to run in multiroot (which runs projects in parallel):
// 1. debug tests are here because runMultiRootProjectsInParallel=true is not applicable to debug, so there's not point running them
// 2. execFriendlyCmd=true tests are here because we always want to use the real-world cp.spawn in multi-root

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  test("runAll - execFriendlyCmd with behave.ini", async () =>
    await testProjectRunner.runAll(wsConfig, behaveIni, noRunOptions, expectations, true));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations, true));
});

