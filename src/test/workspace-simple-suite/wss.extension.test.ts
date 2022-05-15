import { getWssExpectedResults } from "./wss.expectedResults";
import { getWssExpectedCounts } from "./wss.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";


suite(`workspace-simple-suite test run`, () => {
	const wkspName = "example-project-simple";
	const testPre = `runHandler should return expected results for "${wkspName}" with configuration:`;
	const multiRootFolderIgnoreList = "multiroot-ignored-project";
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, multiRootRunWorkspacesInParallel: undefined, multiRootFolderIgnoreList: multiRootFolderIgnoreList,
			envVarList: undefined, fastSkipList: undefined, featuresPath: undefined,
			alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getWssExpectedCounts, getWssExpectedResults);

	}).timeout(60000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(60000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(60000);
	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(wkspName, "", getWssExpectedCounts, getWssExpectedResults)).timeout(60000);
}).timeout(600000);



