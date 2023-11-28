import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { Expectations, TestWorkspaceRunners, ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners";


suite(`higher steps folder suite`, () => {
	const folderName = "higher steps folder";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);


	const cfg: ConfigOptions = {
		projName: folderName,
		envVarOverrides: undefined,
		runProfiles: undefined,
		stepLibraries: undefined
	};

	const rOpt: RunOptions = {
		projName: folderName,
		selectedRunProfile: undefined
	}

	const expectations: Expectations = {
		expectedProjectRelativeBaseDirPath: "",
		expectedProjectRelativeConfigPaths: ["subfolder/features"],
		expectedProjectRelativeFeatureFolders: ["subfolder/features"],
		expectedProjectRelativeStepsFolders: ["steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}

	test("runAll", async () =>
		await testWorkspaceRunners.runAll(cfg, rOpt, expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(cfg, rOpt, expectations)).timeout(300000);

	test("debugAll", async () => await testWorkspaceRunners.debugAll(cfg, rOpt, expectations)).timeout(300000);

}).timeout(900000);



