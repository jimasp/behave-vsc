import { getExpectedResultsForTag1RunProfile } from "./expectedResults";
import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni } from "../_helpers/common";
import { wsConfig, expectations, runOptions, } from "./defaults";


suite(`run profiles suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("run profiles");

  test("debugAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.debugAll(wsConfig, emptyBehaveIni, runOptions, expectations);
  })


});
