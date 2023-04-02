import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`simple suite`, () => {
	const folderName = "simple";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault", async () =>
		await sharedWorkspaceTests.runDefault(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



