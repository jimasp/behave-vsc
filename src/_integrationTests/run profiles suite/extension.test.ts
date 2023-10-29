import {
	getExpectedResultsForNoTagExpression,
	getExpectedResultsForTag1Or2Expression, getExpectedResultsForTag1Expression,
	getExpectedResultsForTag2Expression, getExpectedCounts
} from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


export const runProfilesWorkspaceEnvVarOverrides = { "var1": "OVR-1", "var3": "OVR-3" };

export const runProfilesWorkspaceRunProfiles = {
	"tag1 profile": {
		envVars: {
			var1: "TAG1-1",
			var2: "TAG1-2",
		},
		tagExpression: "@tag1",
	},
	"tag2 profile": {
		envVars: {
			var1: "TAG2-1",
			var2: "TAG2-2",
		},
		tagExpression: "@tag2",
	},
	"tag1or2 profile": {
		envVars: {
			var1: "TAG1-OR-2-1",
			var2: "TAG1-OR-2-2",
		},
		tagExpression: "@tag1,@tag2",
	},
};

suite(`run profiles suite`, () => {
	const folderName = "run profiles";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runWithRunProfiles", async () =>
		await sharedWorkspaceTests.runWithRunProfiles(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForNoTagExpression,
			runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "",
			{})
	).timeout(300000);

	test("runWithRunProfiles", async () =>
		await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1Expression,
			runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag1",
			{ var1: "TAG1-1", var2: "TAG1-2" })
	).timeout(300000);

	test("runWithRunProfiles", async () =>
		await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag2Expression,
			runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag2",
			{ var1: "TAG2-1", var2: "TAG2-2" })
	).timeout(300000);

	test("runWithRunProfiles", async () =>
		await sharedWorkspaceTests.runDebugWithRunProfiles(folderName,
			"", "features", "features", getExpectedCounts, getExpectedResultsForTag1Or2Expression,
			runProfilesWorkspaceEnvVarOverrides, runProfilesWorkspaceRunProfiles, "@tag1,@tag2",
			{ var1: "TAG1-OR-2-1", var2: "TAG1-OR-2-2" })
	).timeout(300000);

}).timeout(900000);



