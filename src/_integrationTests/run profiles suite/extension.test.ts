import {
	getExpectedResultsForNoRunProfile,
	getExpectedResultsForTag1Or2RunProfile, getExpectedResultsForTag1RunProfile,
	getExpectedResultsForTag2RunProfile, getExpectedCounts
} from "./expectedResults";
import { ProjectRunners } from "../suite-shared/project.runners";
import { RunProfilesSetting } from "../../settings";


export const projectEnvVarOverrides = { "var1": "OVR-1", "var3": "OVR-3" };

export const runProfilesSetting: RunProfilesSetting = {
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
};

suite(`run profiles suite`, () => {
	const folderName = "run profiles";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new ProjectRunners(testPre);

	test("runTogether - no runProfileSetting", async () =>
		await sharedWorkspaceTests.runTogetherWithDefaultConfig(folderName,
			"", "features", getExpectedCounts, getExpectedResultsForNoRunProfile)
	).timeout(300000);

	test("runTogether - no runProfileSetting", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForNoRunProfile,
			projectEnvVarOverrides)
	).timeout(300000);

	test("runTogether - no selected runProfile", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForNoRunProfile,
			projectEnvVarOverrides, runProfilesSetting)
	).timeout(300000);

	test("runTogether - tag1 profile", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag1 profile")
	).timeout(300000);

	test("runTogether - tag2 profile", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag2RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag2 profile")
	).timeout(300000);

	test("runTogether - tag1or2 profile", async () =>
		await sharedWorkspaceTests.runTogether(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1Or2RunProfile,
			projectEnvVarOverrides, runProfilesSetting, "tag1Or2 profile")
	).timeout(300000);


}).timeout(900000);



