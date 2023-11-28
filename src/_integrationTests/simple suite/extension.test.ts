import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { TestWorkspaceRunners, ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners";


suite(`simple suite`, () => {
	const folderName = "simple";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);

	const cfg: ConfigOptions = {
		projName: folderName,
		envVarOverrides: undefined,
		runProfiles: undefined,
		stepLibraries: undefined
	}

	const rOpt: RunOptions = {
		projName: folderName,
		selectedRunProfile: undefined
	}

	const expectations = {
		expectedProjectRelativeBaseDirPath: "features",
		expectedProjectRelativeConfigPaths: ["features"],
		expectedProjectRelativeFeatureFolders: ["features"],
		expectedProjectRelativeStepsFolders: ["features/steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}


	test("runAllWithNoConfig", async () =>
		await testWorkspaceRunners.runAllWithNoConfig(folderName, expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(cfg, rOpt, expectations)).timeout(300000);

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(cfg, rOpt, expectations)).timeout(300000);

}).timeout(900000);



