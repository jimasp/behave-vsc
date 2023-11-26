import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";


suite(`sibling steps folder 2 suite`, () => {
	const folderName = "sibling steps folder 2";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName,
			"subfolder 1/subfolder 2/features", "subfolder 1/subfolder 2", "subfolder 1/subfolder 2/steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"subfolder 1/subfolder 2/features", "subfolder 1/subfolder 2", "subfolder 1/subfolder 2/steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



