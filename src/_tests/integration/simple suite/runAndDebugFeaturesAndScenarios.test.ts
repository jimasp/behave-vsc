import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { expectations } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`simple suite - separate`, function () {

  const testProjectRunner = new TestProjectRunner("simple");

  test("runFeatures", async () =>
    await testProjectRunner.runEachFeature(noConfig, noRunOptions, expectations));

  test("runFeatures - parallel", async () =>
    await testProjectRunner.runEachFeature(parallelConfig, noRunOptions, expectations));

  test("debugFeatures", async () =>
    await testProjectRunner.debugEachFeature(noConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(noConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets - parallel", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(parallelConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(noConfig, noRunOptions, expectations));

});




