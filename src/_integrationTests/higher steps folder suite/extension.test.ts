import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`higher steps folder suite`, () => {
	const folderName = "higher steps folder";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "subfolder/features", "steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "subfolder/features", "steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



