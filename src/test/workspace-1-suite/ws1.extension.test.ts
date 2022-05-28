import { getWs1ExpectedCounts, getWs1ExpectedResults } from "./ws1.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";


suite(`workspace-1-suite test run`, () => {
	const folderName = "project-1";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(folderName, "/behave tests/some tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(300000);
	test("runParallel", async () => await sharedWorkspaceTests.runParallel(folderName, "behave tests/some tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(300000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(folderName, "/behave tests/some tests", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(300000);
	test("runDebug", async () => await sharedWorkspaceTests.runDebug(folderName, "/behave tests/some tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(300000);

}).timeout(900000);

