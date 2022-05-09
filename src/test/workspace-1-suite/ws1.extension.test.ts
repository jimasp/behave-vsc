import { getWs1ExpectedCounts, getWs1ExpectedResults } from "./ws1.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { checkParseFileCounts } from "../workspace-suite-shared/extension.test.helpers";

suite(`workspace-1-suite test run`, () => {
	const wkspName = "example-project-workspace-1";
	const testPre = `runHandler should return expected results for "${wkspName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("checkParseCounts", async () => {
		await checkParseFileCounts(wkspName, getWs1ExpectedCounts);
	}).timeout(60000);

	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(wkspName, "/behave_tests/some_tests/", getWs1ExpectedResults)).timeout(60000);
	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspName, "behave_tests/some_tests/", getWs1ExpectedResults)).timeout(60000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspName, "/behave_tests/some_tests", getWs1ExpectedResults)).timeout(60000);
	test("runDebug", async () => await sharedWorkspaceTests.runDebug(wkspName, "/behave_tests/some_tests/", getWs1ExpectedResults)).timeout(180000);

}).timeout(600000);

