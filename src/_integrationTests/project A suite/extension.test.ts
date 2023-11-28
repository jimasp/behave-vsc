import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { Expectations, TestWorkspaceRunners, ConfigOptions, RunOptions } from "../suite-helpers/testWorkspaceRunners";


suite(`project A suite`, () => {
	const folderName = "project A";
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
		expectedProjectRelativeBaseDirPath: "behave tests/some tests",
		expectedProjectRelativeConfigPaths: ["behave tests/some tests"],
		expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
		expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}


	test("runAll", async () =>
		await testWorkspaceRunners.runAll(cfg, rOpt, expectations)).timeout(300000);

	test("runAllParallel", async () =>
		await testWorkspaceRunners.runAllParallel(cfg, rOpt, expectations)).timeout(300000);

}).timeout(900000);

