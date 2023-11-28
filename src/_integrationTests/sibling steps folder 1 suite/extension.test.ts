import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";


suite(`sibling steps folder 1 suite`, () => {
	const folderName = "sibling steps folder 1";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

	test("runAllWithDefaultConfig", async () =>
		await testWorkspaceRunners.runAllWithNoConfig(folderName, "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(folderName, "", "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(folderName, "", "", "steps", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);



