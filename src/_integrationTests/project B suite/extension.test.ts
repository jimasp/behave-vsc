import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { Expectations, ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


suite(`project B suite`, () => {
	const folderName = "project B";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	const options: TestRunOptions = {
		projName: folderName,
		envVarOverrides: undefined,
		runProfiles: undefined,
		selectedRunProfile: undefined,
		// imports, i.e. features/grouped/steps + features/grouped2/steps
		stepLibraries: [
			{
				"relativePath": "features",
				"stepFilesRx": ".*/steps/.*"
			}
		]
	};

	const expectations: Expectations = {
		expectedProjectRelativeBaseDirPath: "features",
		expectedProjectRelativeConfigPaths: ["features"],
		expectedProjectRelativeFeatureFolders: ["features"],
		expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of stepLibraries
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}


	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(options, expectations)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(options, expectations)).timeout(300000);

}).timeout(900000);



