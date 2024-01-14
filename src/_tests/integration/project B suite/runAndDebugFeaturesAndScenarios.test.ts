import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { expectations, wsConfig, wsConfigParallel } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`project B suite - separate`, function () {

  const testProjectRunner = new TestProjectRunner("project B");

  // test("runFeatures", async () =>
  //   await testProjectRunner.runEachFeature(wsConfig, noRunOptions, expectations));

  // test("runFeatures - parallel", async () =>
  //   await testProjectRunner.runEachFeature(wsConfigParallel, noRunOptions, expectations));

  // test("debugFeatures", async () =>
  //   await testProjectRunner.debugEachFeature(wsConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(wsConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets - parallel", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(wsConfigParallel, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetsForEachFeature(wsConfig, noRunOptions, expectations));

});




