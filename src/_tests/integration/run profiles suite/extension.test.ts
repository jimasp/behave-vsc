import {
	getExpectedResultsForAProfileWithoutTags,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile
} from "./expectedResults";
import { TestWorkspaceRunners, noBehaveIni } from "../_helpers/testWorkspaceRunners";
import { runOptions, wsConfig, expectations } from "./defaults";



suite(`run profiles suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("run profiles");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})

	test("runAll - stage2 profile", async () => {
		runOptions.selectedRunProfile = "stage2 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})

	test("runAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})

	test("runAll - tag1 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})

	test("runAll - tag2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag2RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})

	test("runAll - tag1or2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1or2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	})


});



