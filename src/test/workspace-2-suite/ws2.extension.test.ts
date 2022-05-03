import { getWs2ExpectedResults } from "./ws2.expectedResults";
import { getWs2ExpectedCounts } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { getWorkspaceUriFromName, runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";

const wkspName = "example-project-workspace-2";
const wkspUri = getWorkspaceUriFromName(wkspName);
const testPre = `runHandler should return expected results for "example-workspace-2" with configuration:`;

suite(`workspace-2-suite test run`, () => {
	const sharedWorkspaceTests = new SharedWorkspaceTests(2);

	test("runDefault", async () => {

		const testConfig = new TestWorkspaceConfig({
			runAllAsOne: undefined, runParallel: undefined, runWorkspacesInParallel: undefined,
			envVarList: undefined, fastSkipList: undefined, featuresPath: undefined,
			alwaysShowOutput: undefined, justMyCode: undefined, showConfigurationWarnings: undefined
		});

		console.log(`${testPre}: ${JSON.stringify(testConfig)}`);
		await runAllTestsAndAssertTheResults(false, wkspUri, testConfig, getWs2ExpectedCounts, getWs2ExpectedResults);

	}).timeout(60000);

	test("runParallel", async () => await sharedWorkspaceTests.runParallel(wkspUri, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(60000);
	test("runOneByOne", async () => await sharedWorkspaceTests.runOneByOne(wkspUri, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(60000);
	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne(wkspUri, "", getWs2ExpectedCounts, getWs2ExpectedResults)).timeout(60000);
}).timeout(600000);



