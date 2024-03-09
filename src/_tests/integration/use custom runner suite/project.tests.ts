import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { wsConfig, expectations, runOptions, wsConfigParallel, } from "./config";
import {
  getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles,
  getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles
} from "./expectedResults";


suite(`use custom runner suite: project.tests`, () => {
  const testProjectRunner = new TestProjectRunner("use custom runner");

  test("debugAll - custom runner profile", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - custom runner profile: wait for results", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - custom runner profile: wait for results - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations);
  });

  test("runAll - custom runner profile: do not wait for results", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
  });

  test("runAll - custom runner profile: do not wait for results - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations);
  });

  test("runSubsetOfScenariosForEachFeature", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runSubsetOfScenariosForEachFeature - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noBehaveIni, runOptions, expectations)
  });

  test("debugFeaturesScenariosSubSets", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runSubsetOfFeaturesForEachFolder", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, noBehaveIni, runOptions, expectations)
  });

  test("runAllFolders", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAllFolders(wsConfigParallel, noBehaveIni, runOptions, expectations)
  });

  // same tests run above (except debug) but with execFriendlyCmd=true:

  test("runAll - custom runner profile: wait for results", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile: wait for results - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile: do not wait for results", async () => {
    await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
  });

  test("runAll - custom runner profile: do not wait for results - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles;
    await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations, true);
  });

  test("runSubsetOfScenariosForEachFeature", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runSubsetOfScenariosForEachFeature - parallel", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfigParallel, noBehaveIni, runOptions, expectations, true)
  });

  test("debugFeaturesScenariosSubSets", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.debugSubsetOfScenariosForEachFeature(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runSubsetOfFeaturesForEachFolder", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runSubsetOfFeaturesForEachFolder(wsConfig, noBehaveIni, runOptions, expectations, true)
  });

  test("runAllFolders", async () => {
    runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
    expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
    await testProjectRunner.runAllFolders(wsConfigParallel, noBehaveIni, runOptions, expectations, true)
  });



});

