import { getExpectedResultsForTag1RunProfile } from "./expectedResults";
import { TestProjectRunner, noBehaveIni } from "../_helpers/testProjectRunner";
import { wsConfig, expectations, runOptions, } from "./defaults";


// this file is separate because we don't want to run parallel debug 
// sessions (which is not supported) when running the multi-root tests 

suite(`run profiles suite test debug run`, () => {
  const testProjectRunner = new TestProjectRunner("run profiles");

  test("debugAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  })


});

