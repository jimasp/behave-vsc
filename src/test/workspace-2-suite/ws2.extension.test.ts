import { getWs2ExpectedResults } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { TestWorkspaceConfig } from "../workspace-suite-shared/testWorkspaceConfig";
import { runAllTestsAndAssertTheResults } from "../workspace-suite-shared/extension.test.helpers";

const testPre = "runHandler should return expected results for example-project-workpace-2 with configuration:";

suite(`workspace-2-suite test run`, () => {
	const sharedWorkspaceTests = new SharedWorkspaceTests(2);

	test("runDefault", async () => {
		console.log(`${testPre}: { runParallel: undefined, runAllAsOne: undefined, fastSkipList: undefined, ` +
			`envVarList: undefined, featuresPath: undefined }`);

		const testConfig = new TestWorkspaceConfig();
		await runAllTestsAndAssertTheResults(false, testConfig, getWs2ExpectedResults);
	}).timeout(120000);


	test("runAllAsOne", async () => await sharedWorkspaceTests.runAllAsOne("", getWs2ExpectedResults)).timeout(60000);
	test("runOneByone", async () => await sharedWorkspaceTests.runOneByOne("", getWs2ExpectedResults)).timeout(60000);
	test("runParallel", async () => await sharedWorkspaceTests.runParallel("", getWs2ExpectedResults)).timeout(60000);
	test("runDebug", async () => await sharedWorkspaceTests.runDebug("", getWs2ExpectedResults)).timeout(180000);
}).timeout(600000);

