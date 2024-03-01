import { TestProjectRunner } from "../_common/projectRunner";
import { noConfig, noRunOptions } from "../_common/types";
import { behaveIni, expectations } from "./config";



suite(`sibling steps folder 2 suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("sibling steps folder 2");

  test("debugAll", async () => await testProjectRunner.debugAll(noConfig, behaveIni, noRunOptions, expectations));

});

