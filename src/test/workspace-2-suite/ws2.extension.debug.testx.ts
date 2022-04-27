import { getWs2ExpectedResults } from "./ws2.expectedResults";
import { SharedWorkspaceTests } from "../workspace-suite-shared/shared.workspace.tests";
import { getWorkspaceUriFromName } from "../workspace-suite-shared/extension.test.helpers";

const wkspName = "example-project-workspace-2";
const wkspUri = getWorkspaceUriFromName(wkspName);

// this file is separate because we don't want to run parallel debug sessions (which is not supported) when running the multi-root tests 

suite(`workspace-2-suite test run`, () => {
  const sharedWorkspaceTests = new SharedWorkspaceTests(2);
  test("runDebug", async () => await sharedWorkspaceTests.runDebug(wkspUri, "", getWs2ExpectedResults)).timeout(180000);
}).timeout(600000);

