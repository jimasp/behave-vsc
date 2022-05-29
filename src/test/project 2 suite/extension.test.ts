import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../suite-shared/testWorkspaceConfig";
import { runAllTestsAndAssertTheResults } from "../suite-shared/extension.test.helpers";


suite(`project 2 suite`, () => {
	const folderName = "project 2";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault (runAll)", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
			envVarList: undefined, fastSkipList: undefined, featuresPath: undefined,
			justMyCode: undefined, showSettingsWarnings: undefined, logDiagnostics: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, folderName, testConfig, getExpectedCounts, getExpectedResults);

	}).timeout(300000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);
}).timeout(900000);



