import { TestProjectRunner, noBehaveIni, noConfig, noRunOptions, parallelConfig } from "../_helpers/runners/projectRunner";
import { behaveIni, expectations } from "./defaults";

// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)


suite(`simple suite - separate`, function () {

  const testProjectRunner = new TestProjectRunner("simple");

  test("runScenarios", async () =>
    await testProjectRunner.runScenarios(noConfig, noRunOptions, expectations));

});




