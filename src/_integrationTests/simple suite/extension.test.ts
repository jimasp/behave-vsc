import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


suite(`simple suite`, () => {
	const folderName = "simple";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	const options: TestRunOptions = {
		projName: folderName,
		expectedProjectRelativeBaseDirPath: "features",
		expectedProjectRelativeConfigPaths: ["features"],
		expectedProjectRelativeFeatureFolders: ["features"],
		expectedProjectRelativeStepsFolders: ["features/steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
		envVarOverrides: undefined,
		runProfiles: undefined,
		selectedRunProfile: undefined,
		stepLibraries: undefined
	};


	test("runDefault", async () =>
		await sharedWorkspaceTests.runTogetherWithDefaultSettings(options)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(options)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(options)).timeout(300000);

}).timeout(900000);



