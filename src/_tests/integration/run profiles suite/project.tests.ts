import { getExpectedResultsForNoTagsSpecified, getExpectedResultsForTag1orTag2RunProfile, getExpectedResultsForTag1RunProfile, getExpectedResultsForTag2RunProfile } from "./expectedResults";
import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { wsConfig, expectations, runOptions, } from "./config";



suite(`run profiles suite test: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("run profiles");

  test("debugAll - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForNoTagsSpecified;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("debugAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - stage2 profile", async () => {
    runOptions.selectedRunProfile = "stage2 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForNoTagsSpecified;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - tag1 profile", async () => {
    runOptions.selectedRunProfile = "tag1 profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - tag2 vars profile", async () => {
    runOptions.selectedRunProfile = "tag2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag2RunProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - tag1ortag2 vars profile", async () => {
    runOptions.selectedRunProfile = "tag1ortag2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1orTag2RunProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runScenariosSubSetForEachFeature - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForNoTagsSpecified;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - tag1 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runScenariosSubSetForEachFeature - tag1ortag2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1ortag2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1orTag2RunProfile;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runSubsetOfFeaturesForEachFolder - tag1ortag2 vars profile (ExecFriendlyCmd)", async () => {
    runOptions.selectedRunProfile = "tag1ortag2 vars profile";
    expectations.getExpectedResultsFunc = getExpectedResultsForTag1orTag2RunProfile;
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

});

