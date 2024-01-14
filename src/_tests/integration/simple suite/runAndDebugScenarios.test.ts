import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noConfig, noRunOptions, parallelConfig } from "../_helpers/common"
import { expectations } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`simple suite - scenarios`, function () {

  const testProjectRunner = new TestProjectRunner("simple");

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(noConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets - parallel", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(parallelConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(noConfig, noRunOptions, expectations));

});




