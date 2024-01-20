import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common";
import { wsConfig, expectations } from "./defaults";


// debug tests are in this separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`project B suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project B");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectations));

  test("debugFeaturesScenariosSubSets", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noRunOptions, expectations));

});

