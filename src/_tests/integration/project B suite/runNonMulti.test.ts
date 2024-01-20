import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations } from "./defaults";

// separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// i.e. contains test runs we specifically do NOT want to run in multiroot (which runs projects in parallel):
// 1. debug tests are here because runMultiRootProjectsInParallel=true is not applicable to debug, so there's not point running them
// 2. execFriendlyCmd=true tests are here because we always want to use the real-world cp.spawn in multi-root

suite(`project B suite: nonMulti`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

  test("runAll - execFriendlyCmd", async () =>
    await testProjectRunner.runAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("runScenariosSubSetForEachFeature - execFriendlyCmd", async () =>
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations, true));

});

