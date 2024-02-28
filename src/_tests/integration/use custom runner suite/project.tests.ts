import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { wsConfig, expectations, runOptions, wsConfigParallel, } from "./config";
import {
  getExpectedResultsForNoProfile, getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults,
  getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults
} from "./expectedResults";


suite(`use custom runner suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("use custom runner");

  test("debugAll - custom runner profile", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("debugFeaturesScenariosSubSets", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runSubsetOfScenariosForEachFeature", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runSubsetOfScenariosForEachFeature - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noBehaveIni, runOptions, expectations)
  });

  test("runFeatureSet", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runFeatureSet(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runAllFolders", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runAllFolders(wsConfigParallel, noBehaveIni, runOptions, expectations)
  });

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("debugFeaturesScenariosSubSets", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runSubsetOfScenariosForEachFeature", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runSubsetOfScenariosForEachFeature - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noBehaveIni, runOptions, expectations, true)
  });

  test("runFeatureSet", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runFeatureSet(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runAllFolders", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runAllFolders(wsConfigParallel, noBehaveIni, runOptions, expectations, true)
  });

  // below are same as multi.tests but no run parallel and with execFriendlyCmd = true

  test("runAll - no selected runProfile", async () => {
    runOptions.selectedRunProfile = undefined;
    expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile: wait for results", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile: do not wait for results", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

});

