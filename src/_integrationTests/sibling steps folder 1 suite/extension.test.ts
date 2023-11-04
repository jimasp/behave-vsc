import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`sibling steps folder 1 suite`, () => {
	const folderName = "sibling steps folder 1";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault", async () =>
		await sharedWorkspaceTests.runTogetherWithDefaultSettings(folderName, "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "", "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



