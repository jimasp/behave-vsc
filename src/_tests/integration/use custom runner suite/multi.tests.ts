import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { runOptions, wsConfig, expectations } from "./config";
import {
	getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles,
	getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles,
	getExpectedResultsForNoProfile
} from "./expectedResults";



suite(`use custom runner suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("use custom runner");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: WAIT for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: do not wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});


});



