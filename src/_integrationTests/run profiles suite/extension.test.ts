import {
	getExpectedResultsForAProfileWithoutTags,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile
} from "./expectedResults";
import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";
import { runOptions, wsConfig, runProfiles, expectations } from "./defaults";



suite(`run profiles suite`, () => {
	const testWorkspaceRunners = new TestWorkspaceRunners("run profiles");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);

	test("runAll - stage2 profile", async () => {
		runOptions.selectedRunProfile = "stage2 profile";
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);

	test("runAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);

	test("runAll - tag1 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1 vars profile";
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);

	test("runAll - tag2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag2 vars profile";
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForTag2RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);

	test("runAll - tag1or2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1or2 vars profile";
		wsConfig.runProfiles = runProfiles;
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
		await testWorkspaceRunners.runAll(wsConfig, runOptions, expectations);
	}).timeout(300000);


}).timeout(900000);



