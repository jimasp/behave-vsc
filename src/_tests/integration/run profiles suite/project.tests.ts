import { getExpectedResultsForNoTagsSpecified, getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile } from "./expectedResults";
import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { wsConfig, expectations, runOptions, } from "./config";



suite(`run profiles suite test: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("run profiles");

  test("debugAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  })

  test("runScenariosSubSetForEachFeature - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForNoTagsSpecified;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runScenariosSubSetForEachFeature - tag1or2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1or2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runSubsetOfFeaturesForEachFolder - tag1or2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1or2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

});

