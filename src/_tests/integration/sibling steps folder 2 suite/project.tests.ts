import { TestProjectRunner } from "../_runners/projectRunner";
import { noConfig, noRunOptions } from "../_helpers/common";
import { behaveIni, expectations } from "./config";



suite(`sibling steps folder 2 suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("sibling steps folder 2");

  test("debugAll", async () => await testProjectRunner.debugAll(noConfig, behaveIni, noRunOptions, expectations));

});

