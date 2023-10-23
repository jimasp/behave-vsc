import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`project A suite`, () => {
	const folderName = "project A";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "/behave tests/some tests/",
			"/behave tests/some tests", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "behave tests/some tests/",
			"/behave tests/some tests", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runDebug", async () =>
		await sharedWorkspaceTests.runDebug(folderName, "/behave tests/some tests/",
			"/behave tests/some tests", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);

