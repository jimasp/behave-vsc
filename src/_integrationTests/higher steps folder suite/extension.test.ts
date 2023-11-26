import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { Expectations, ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


suite(`higher steps folder suite`, () => {
	const folderName = "higher steps folder";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);


	const options: TestRunOptions = {
		projName: folderName,
		envVarOverrides: undefined,
		runProfiles: undefined,
		selectedRunProfile: undefined,
		stepLibraries: undefined
	};

	const expectations: Expectations = {
		expectedProjectRelativeBaseDirPath: "",
		expectedProjectRelativeConfigPaths: ["subfolder/features"],
		expectedProjectRelativeFeatureFolders: ["subfolder/features"],
		expectedProjectRelativeStepsFolders: ["steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(options, expectations)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(options, expectations)).timeout(300000);

	test("runDebug", async () => await sharedWorkspaceTests.runDebug(options, expectations)).timeout(300000);

}).timeout(900000);



