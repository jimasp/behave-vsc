import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";


suite(`project B suite`, () => {
	const folderName = "project B";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	test("runDefault", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "", "features", "features", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



