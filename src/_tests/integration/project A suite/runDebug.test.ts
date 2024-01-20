import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { behaveIni, expectations, wsConfig } from "./defaults";


// debug tests are in this separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));
});

