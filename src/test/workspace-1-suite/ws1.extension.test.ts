import { getWs1ExpectedResults } from "./ws1.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";

const featuresPath = "behave_tests/some_tests";

suite(`workspace-1-suite test run`, () => {
	const sharedWorkspaceTests = new SharedWorkspaceTests(1);

	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(featuresPath, getWs1ExpectedResults)).timeout(120000);
	test("runOneByone", async () => await sharedWorkspaceTests.runOneByOne(featuresPath, getWs1ExpectedResults)).timeout(120000);
	test("runParallel", async () => await sharedWorkspaceTests.runParallel(featuresPath, getWs1ExpectedResults)).timeout(120000);
	test("runDebug", async () => await sharedWorkspaceTests.runDebug(featuresPath, getWs1ExpectedResults)).timeout(120000);

}).timeout(600000);

