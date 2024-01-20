import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noBehaveIni, noConfig, noRunOptions } from "../_helpers/common"
import { expectations } from "./defaults";


// debug tests are in this separate file so we can ignore this file path in the multi-root suite/index.ts runner() constructor 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`simple suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("simple");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(noConfig, noBehaveIni, noRunOptions, expectations));

  test("debugScenariosSubSetForEachFeature", async () =>
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(noConfig, noRunOptions, expectations));

});

