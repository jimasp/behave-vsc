import { getExpectedResults } from "./ws1.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";


suite(`workspace-1-suite test run`, () => {
	const sharedWorkspaceTests = new SharedWorkspaceTests(1);
	test("test1", async () => await sharedWorkspaceTests.wsTest1(getExpectedResults)).timeout(120000);
	test("test2", async () => await sharedWorkspaceTests.wsTest2(getExpectedResults)).timeout(120000);
	test("test3", async () => await sharedWorkspaceTests.wsTest3(getExpectedResults)).timeout(120000);
	test("test4", async () => await sharedWorkspaceTests.wsTest4(getExpectedResults)).timeout(120000);
}).timeout(600000);

