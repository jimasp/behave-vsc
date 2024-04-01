import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { runOptions, wsConfig, expectations } from "./config";
import {
	getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles,
	getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles,
	getExpectedResultsForMyScriptProfileWaitForJUnitFiles,
	getExpectedResultsForNoProfile
} from "./expectedResults";



suite(`use custom runner suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("use custom runner");

	test("runAll - custom runner profile: manage.py, do not wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile - do not wait for results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileDoNotWaitForJUnitFiles;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: manage.py, wait for results", async () => {
		runOptions.selectedRunProfile = "behave-django runner profile - wait for results";
		expectations.getExpectedResultsFunc = getExpectedResultsForBehaveDjangoProfileWaitForJUnitFiles;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - no profile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - custom runner profile: myscript.py, wait for results", async () => {
		runOptions.selectedRunProfile = "myscript - wait for results";
		expectations.getExpectedResultsFunc = getExpectedResultsForMyScriptProfileWaitForJUnitFiles;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

});



