import { getExpectedResultsForAProfileWithoutTags, getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile } from "./expectedResults";
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

  test("runScenariosSubSetForEachFeature - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, runOptions, expectations);
  });

  test("runScenariosSubSetForEachFeature - tag1or2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1or2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, runOptions, expectations, true);
  });

  test("runFeatureSet - tag1or2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1or2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
    await testProjectRunner.runFeatureSet(wsConfig, runOptions, expectations, true);
  });

});

