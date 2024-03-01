import * as vscode from "vscode";
import { runner } from "../../runner";
import { testGlobals } from "../_common/types";



// MULTIROOT SUITE SPECIFIES ITS OWN TEST FILE GLOBS (AND IGNORES) SUCH THAT
// IT WILL RUN PROJECTS IN PARALLEL (TO SIMULATE runMultiRootProjectsInParallel=True).
export async function run(): Promise<void[]> {

	testGlobals.multiRootTest = true;
	vscode.commands.executeCommand("testing.clearTestResults");

	return Promise.all([
		// we could include all these in a single glob, but it's better to keep them separate 
		// so we can comment them out individually whenever required for debugging purposes.		
		runner("../**/simple suite/multi.tests.js"),
		runner("../**/project A suite/multi.tests.js"),
		runner("../**/project B suite/multi.tests.js"),
		runner("../**/run profiles suite/multi.tests.js"),
		runner("../**/multiple top-level features folders suite/multi.tests.js"),
		runner("../**/imported steps suite/multi.tests.js"),
		runner("../**/sibling steps folder 1 suite/multi.tests.js"),
		runner("../**/sibling steps folder 2 suite/multi.tests.js"),
		runner("../**/working dir suite/multi.tests.js"),
		runner("../**/handle bad import suite/multi.tests.js"),
		runner("../**/use custom runner suite/multi.tests.js"),
	]);
}
