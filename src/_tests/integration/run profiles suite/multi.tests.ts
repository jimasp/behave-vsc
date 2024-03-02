import {
	getExpectedResultsForNoTagsSpecified,
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

});



