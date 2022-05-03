import { getWs1ExpectedCounts, getWs1ExpectedResults } from "./ws1.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { getWorkspaceUriFromName } from '../workspace-suite-shared/extension.test.helpers';

const wkspName = "example-project-workspace-1";
const wkspUri = getWorkspaceUriFromName(wkspName);

suite(`workspace-1-suite test run`, () => {
	const sharedWorkspaceTests = new SharedWorkspaceTests(1);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspUri, "behave_tests/some_tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(60000);
	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(wkspUri, "/behave_tests/some_tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(60000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspUri, "/behave_tests/some_tests", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(60000);
	test("runDebug", async () => await sharedWorkspaceTests.runDebug(wkspUri, "/behave_tests/some_tests/", getWs1ExpectedCounts, getWs1ExpectedResults)).timeout(180000);

}).timeout(600000);

