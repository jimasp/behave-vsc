import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";


suite(`step library suite`, () => {
	const folderName = "step library";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

	test("runWithStepsLibrary", async () =>
		await testWorkspaceRunners.runAll(folderName, "features", "features",
			"????features????",
			getExpectedCounts, getExpectedResults, undefined, undefined, undefined,
			[
				{
					"relativePath": "folder1/steps_lib_1 ",
					"stepFilesRx": ".*/steps/.*"
				},
				{
					"relativePath": "folder2\\steps_lib_2",
					"stepFilesRx": ".*/steps/.*|more_steps/.*|.*/steps2.py|.*/steps3.py",
				}
			],
		)).timeout(300000);

}).timeout(900000);



