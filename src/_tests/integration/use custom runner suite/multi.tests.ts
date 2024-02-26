import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { runOptions, wsConfig, expectations, wsConfigParallel } from "./config";
import {
	getExpectedResultsForNoProfile, getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults,
	getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults
} from "./expectedResults";

suite(`use custom runner suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("use custom runner");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: wait for results - parallel", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults;
		await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: do not wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: do not wait for results - parallel", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults;
		await testProjectRunner.runAll(wsConfigParallel, noBehaveIni, runOptions, expectations);
	});

});



