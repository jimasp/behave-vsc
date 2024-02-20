import {
	getExpectedResultsForAProfileWithoutTags,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile
} from "./expectedResults";
import { TestProjectRunner } from "../_runners/projectRunner";
import { noBehaveIni } from "../_helpers/common";
import { runOptions, wsConfig, expectations } from "./config";


suite(`run profiles suite`, () => {
	const testProjectRunner = new TestProjectRunner("run profiles");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - stage2 profile", async () => {
		runOptions.selectedRunProfile = "stage2 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1 vars profile (ExecFriendlyCmd)", async () => {
		runOptions.selectedRunProfile = "tag1 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations, true);
	});

	test("runAll - tag2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag2RunProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1or2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1or2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

});



