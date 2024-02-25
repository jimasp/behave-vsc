import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { wsConfig, expectations, runOptions, } from "./config";
import {
  getExpectedResultsForNoProfile, getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults,
  getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults
} from "./expectedResults";


suite(`use custom runner suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("use custom runner");

  test("debugAll - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("debugAll - custom runner profile", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  // below are same as multi.tests but with execFriendlyCmd = true

  test("runAll - no selected runProfile ", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

});

