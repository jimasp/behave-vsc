import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/runners/projectRunner";
import { behaveIni, expectations } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`simple suite - separate`, function () {

  const testProjectRunner = new TestProjectRunner("simple");

  // test("runScenarios", async () =>
  //   await testProjectRunner.runScenarios(noConfig, noRunOptions, expectations));

  // test("debugScenarios", async () =>
  //   await testProjectRunner.debugScenarios(noConfig, noRunOptions, expectations));

  // test("runFeatures", async () =>
  //   await testProjectRunner.runFeatures(noConfig, noRunOptions, expectations));

  test("debugFeatures", async () =>
    await testProjectRunner.debugFeatures(noConfig, noRunOptions, expectations));

});




