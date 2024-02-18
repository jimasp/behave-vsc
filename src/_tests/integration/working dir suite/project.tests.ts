import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni, noRunOptions } from "../_helpers/common"
import { expectationsWithoutBehaveIni, wsConfig } from "./defaults";


suite(`working dir suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("working dir");

  test("debugAll", async () =>
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, noRunOptions, expectationsWithoutBehaveIni));

});

