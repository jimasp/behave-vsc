import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { Expectations, TestWorkspaceRunners, ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners";


suite(`project B suite`, () => {
	const folderName = "project B";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

	const cfg: ConfigOptions = {
		projName: folderName,
		envVarOverrides: undefined,
		runProfiles: undefined,
		// imports, i.e. features/grouped/steps + features/grouped2/steps
		stepLibraries: [
			{
				"relativePath": "features",
				"stepFilesRx": ".*/steps/.*"
			}
		]
	};

	const rOpt: RunOptions = {
		projName: folderName,
		selectedRunProfile: undefined
	}

	const expectations: Expectations = {
		expectedProjectRelativeBaseDirPath: "features",
		expectedProjectRelativeConfigPaths: ["features"],
		expectedProjectRelativeFeatureFolders: ["features"],
		expectedProjectRelativeStepsFolders: ["features", "features/steps"], // "features" is because of stepLibraries
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}


	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(cfg, rOpt, expectations)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(cfg, rOpt, expectations)).timeout(300000);

}).timeout(900000);



