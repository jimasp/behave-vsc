import { getExpectedCounts, getExpectedResults } from "./expectedResults";
import { Expectations, ProjectRunners, TestRunOptions } from "../suite-shared/project.runners";


suite(`project A suite`, () => {
	const folderName = "project A";
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
		expectedProjectRelativeBaseDirPath: "features",
		expectedProjectRelativeConfigPaths: ["/behave tests/some tests/"],
		expectedProjectRelativeFeatureFolders: ["behave tests/some tests"],
		expectedProjectRelativeStepsFolders: ["behave tests/some tests/steps"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResults,
	}


	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(options, expectations)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(options, expectations)).timeout(300000);

}).timeout(900000);

