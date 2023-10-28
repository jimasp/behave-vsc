import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`project B suite`, () => {
	const folderName = "project B";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



