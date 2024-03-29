import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`sibling steps folder 3 suite`, () => {
	const folderName = "sibling steps folder 3";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "subfolder 1/subfolder 2/features", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "subfolder 1/subfolder 2/features", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



