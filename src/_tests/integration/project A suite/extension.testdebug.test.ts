import { TestProjectRunner, noRunOptions } from "../_helpers/testProjectRunner";
import { behaveIni, expectationsWithSettingsJson, wsConfig } from "./default";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests (i.e. runMultiRootWorkspacesInParallel=true)

suite(`higher steps folder suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("project A");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, behaveIni, noRunOptions, expectationsWithSettingsJson)
  )


});

