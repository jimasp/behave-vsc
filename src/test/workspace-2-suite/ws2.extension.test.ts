import { getWs2ExpectedResults } from "./ws2.expectedResults";
import { getWs2ExpectedCounts } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { checkParseFileCounts, runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";


suite(`workspace-2-suite test run`, () => {
	const wkspName = "example-project-workspace-2";
	const testPre = `runHandler should return expected results for "${wkspName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("checkParseCounts", async () => {
		await checkParseFileCounts(wkspName, getWs2ExpectedCounts);
	}).timeout(5000);

	test("runDefault", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, runWorkspacesInParallel: undefined,
			envVarList: undefined, fastSkipList: undefined, wkspRelativeFeaturesPath: undefined,
			alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getWs2ExpectedResults);

	}).timeout(60000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspName, "", getWs2ExpectedResults)).timeout(60000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspName, "", getWs2ExpectedResults)).timeout(60000);
	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(wkspName, "", getWs2ExpectedResults)).timeout(60000);
}).timeout(600000);



