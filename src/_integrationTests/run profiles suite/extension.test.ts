import {
	getExpectedResultsForNoRunProfile,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile, getExpectedCounts
} from "./expectedResults";
import { Expectations, TestWorkspaceRunners } from "../suite-helpers/testWorkspaceRunners";



suite(`run profiles suite`, () => {
	const folderName = "run profiles";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const testWorkspaceRunners = new TestWorkspaceRunners(testPre);


	const options: TestRunOptions = {
		projName: folderName,
		envVarOverrides: { "var1": "OVR-1", "var3": "OVR-3" },
		runProfiles: {
			"just_envVarOverrides profile": {
				"envVarOverrides": {
					"var1": "ENV-1",
					"var2": "ENV-2"
				},
			},
			"just_tagExpression profile": {
				"tagExpression": "@tag1",
			},
			"tag1 profile": {
				"envVarOverrides": {
					"var1": "TAG1-1",
					"var2": "TAG1-2"
				},
				"tagExpression": "@tag1",
			},
			"tag2 profile": {
				"envVarOverrides": {
					"var1": "TAG2-1",
					"var2": "TAG2-2"
				},
				"tagExpression": "@tag2",
			},
			"tag1or2 profile": {
				"envVarOverrides": {
					"var1": "TAG1-OR-2-1",
					"var2": "TAG1-OR-2-2"
				},
				"tagExpression": "@tag1,@tag2",
			},
		},
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
		expectedProjectRelativeStepsFolders: ["features"],
		getExpectedCountsFunc: getExpectedCounts,
		getExpectedResultsFunc: getExpectedResultsForNoRunProfile,
	}


	test("runAllWithNoConfig - no config", async () =>
		await testWorkspaceRunners.runAllWithNoConfig(options, expectations)).timeout(300000);

	test("runAll - no runProfileSetting", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForNoRunProfile,
			projectEnvVarOverrides)
	).timeout(300000);

	test("runAll - no selected runProfile", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForNoRunProfile,
			projectEnvVarOverrides, runProfilesSetting)
	).timeout(300000);

	test("runAll - tag1 profile", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag1 profile")
	).timeout(300000);

	test("runAll - tag2 profile", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag2RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag2 profile")
	).timeout(300000);

	test("runAll - tag1or2 profile", async () =>
		await testWorkspaceRunners.runAll(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1Or2RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag1Or2 profile")
	).timeout(300000);


}).timeout(900000);



