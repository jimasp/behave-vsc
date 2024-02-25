import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { runOptions, wsConfig, expectations } from "./config";
import { getExpectedResultsForNoProfile, getExpectedResultsForBehaveDjangoProfileWaitForJUnitResults, getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitResults } from "./expectedResults";


suite(`use custom runner suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("use custom runner");

	// test("runAll - no selected runProfile (execFriendlyCmd)", async () => {
	// 	runOptions.selectedRunProfile = undefined;
	// 	expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
	// 	await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	// });

	// test("runAll - custom runner profile (execFriendlyCmd)", async () => {
	// 	runOptions.selectedRunProfile = "behave-django runner profile: wait for test results";
	// 	expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWithwaitForJUnitResults;
	// 	await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	// });

	// test("runAll - custom runner profile (execFriendlyCmd)", async () => {
	// 	runOptions.selectedRunProfile = "behave-django runner profile: do NOT wait for test results";
	// 	expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWithoutwaitForJUnitResults;
	// 	await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	// });

});



