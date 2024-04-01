import {
	getExpectedResultsForNoTagsSpecified, getExpectedResultsForTag1RunProfile,
} from "./expectedResults";
import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { runOptions, wsConfig, expectations } from "./config";


suite(`run profiles suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("run profiles");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForNoTagsSpecified;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("runAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

	test("debugAll - tag1 profile", async () => {
		runOptions.selectedRunProfile = "tag1 profile";
		expectations.getExpectedResultsFunc = getExpectedResultsForTag1RunProfile;
		await testProjectRunner.debugAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

});



