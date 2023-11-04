import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`step library suite`, () => {
	const folderName = "step library";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runWithStepsLibrary", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "features", "features",
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



