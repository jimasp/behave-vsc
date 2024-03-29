import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`sibling steps folder 2 suite`, () => {
	const folderName = "sibling steps folder 2";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "Featurez", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "Featurez", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



