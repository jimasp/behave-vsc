import { getWs2ExpectedResults } from "./ws2.expectedResults";
import { getWs2ExpectedCounts } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";


suite(`workspace-2-suite test run`, () => {
	const wkspName = "example-project-2";
	const testPre = `runHandler should return expected results for "${wkspName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault (runAll)", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, multiRootRunWorkspacesInParallel: undefined,
			envVarList: undefined, fastSkipList: undefined, featuresPath: undefined,
			alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: undefined, logDiagnostics: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, wkspName, testConfig, getWs2ExpectedCounts, getWs2ExpectedResults);

	}).timeout(300000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspName, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(300000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspName, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(300000);
}).timeout(900000);



