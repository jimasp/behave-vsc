import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { noRunOptions } from "../_helpers/common"
import { expectations, wsConfig, wsConfigParallel } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`project B suite - separate`, function () {

  const testProjectRunner = new TestProjectRunner("project B");

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(wsConfig, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets - parallel", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(wsConfigParallel, noRunOptions, expectations));

  test("runFeaturesScenariosSubSets", async () =>
    await testProjectRunner.runScenariosSubSetForEachFeature(wsConfig, noRunOptions, expectations));

});




