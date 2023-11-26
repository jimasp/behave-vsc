import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";


suite(`project A suite`, () => {
	const folderName = "project A";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"/behave tests/some tests/", "behave tests/some tests", "behave tests/some tests",
			getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName,
			"behave tests/some tests/", "behave tests/some tests", "behave tests/some tests",
			getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);

