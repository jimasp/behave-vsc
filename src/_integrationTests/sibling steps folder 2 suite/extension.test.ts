import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";


suite(`sibling steps folder 2 suite`, () => {
	const folderName = "sibling steps folder 2";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(folderName,
			"subfolder 1/subfolder 2/features", "subfolder 1/subfolder 2", "subfolder 1/subfolder 2/steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"subfolder 1/subfolder 2/features", "subfolder 1/subfolder 2", "subfolder 1/subfolder 2/steps",
			getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



