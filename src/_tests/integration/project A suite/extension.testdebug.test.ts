import { TestProjectRunner, noRunOptions } from "../_helpers/runners/projectRunner";
import { behaveIni, expectationsWithSettingsJson, wsConfig } from "./default";


// this file is separate because we don't want to run parallel debug 
// sessions when running the multi-root suite/index.ts tests 
// (runMultiRootProjectsInParallel=true is not applicable to debug)

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectationsWithSettingsJson)
  )


});

