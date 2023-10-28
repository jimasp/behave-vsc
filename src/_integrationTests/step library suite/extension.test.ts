import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`step library suite`, () => {
	const folderName = "step library";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runWithStepsLibrary", async () =>
		await sharedWorkspaceTests.runWithStepsLibrary(folderName, "features", "features", ["steps_lib_1", "steps_lib_2"],
			getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



