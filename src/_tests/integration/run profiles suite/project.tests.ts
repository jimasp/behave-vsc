import { getExpectedResultsForTag1RunProfile } from "./expectedResults";
import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { wsConfig, expectations, runOptions, } from "./config";



suite(`run profiles suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("run profiles");

  test("debugAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  })

});

