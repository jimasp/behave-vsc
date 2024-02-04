import {
	getExpectedResultsForAProfileWithoutTags,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile
} from "./expectedResults";
import { TestProjectRunner } from "../_helpers/runners/projectRunner";
import { emptyBehaveIni } from "../_helpers/common";
import { runOptions, wsConfig, expectations } from "./defaults";


// THIS FILE CONTAINS TESTS THAT WE WANT TO RUN FROM ../multi-root suite/index.ts
// i.e. tests we want to run in parallel with other projects
//
// (These tests will ALSO be run via ./index.ts)

suite(`run profiles suite`, () => {
	const testProjectRunner = new TestProjectRunner("run profiles");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runAll - stage2 profile", async () => {
		runOptions.selectedRunProfile = "stage2 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runAll - tag2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag2RunProfile;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1or2 vars profile", async () => {
		runOptions.selectedRunProfile = "tag1or2 vars profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1Or2RunProfile;
		await testProjectRunner.runAll(wsConfig, emptyBehaveIni, runOptions, expectations);
	});

	test("runScenariosSubSetForEachFeature - tag1or2 vars profile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForAProfileWithoutTags;
		await testProjectRunner.runSubsetOfScenariosForEachFeature(wsConfig, runOptions, expectations);
	});

});


