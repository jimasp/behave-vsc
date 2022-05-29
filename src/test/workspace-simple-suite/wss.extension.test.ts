import { getWssExpectedResults } from "./wss.expectedResults";
import { getWssExpectedCounts } from "./wss.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";


suite(`workspace-simple-suite test run`, () => {
	const folderName = "project simple";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault (runAll)", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
			envVarList: undefined, fastSkipList: undefined, featuresPath: undefined,
			justMyCode: undefined, showSettingsWarnings: undefined, logDiagnostics: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, folderName, testConfig, getWssExpectedCounts, getWssExpectedResults);

	}).timeout(300000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(folderName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(300000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(folderName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(300000);
}).timeout(900000);



