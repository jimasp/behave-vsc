import { TestProjectRunner } from "../_common/projectRunner";
import { noBehaveIni } from "../_common/types";
import { runOptions, wsConfig, expectations } from "./config";
import {
	getExpectedResultsForNoProfile
} from "./expectedResults";

suite(`use custom runner suite: multi.tests`, () => {
	const testProjectRunner = new TestProjectRunner("use custom runner");

	test("runAll - no selected runProfile", async () => {
		runOptions.selectedRunProfile = undefined;
		expectations.getExpectedResultsFunc = getExpectedResultsForNoProfile;
		await testProjectRunner.runAll(wsConfig, noBehaveIni, runOptions, expectations);
	});

});



