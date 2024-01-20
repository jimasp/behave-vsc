import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common"
import { behaveIni, expectations } from "./defaults";

// separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// i.e. contains test runs we don't want to run in multiroot (which runs projects in parallel):
// 1. debug tests are here because runMultiRootProjectsInParallel=true is not applicable to debug, so there's not point running them
// 2. execFriendlyCmd=true tests are here because we always want to use the real-world cp.spawn in multi-root

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

});

