import * as vscode from "vscode";
import { runner } from "../../runner";
import { testGlobals } from "../_common/types";



// HERE (MULTIROOT SUITE) WE SPECIFY THE multi.test.js TEST FILE GLOBS SUCH THAT
// IT WILL RUN PROJECTS IN PARALLEL (TO SIMULATE runMultiRootProjectsInParallel=True).
export async function run(): Promise<void[]> {

	testGlobals.multiRootTest = true;
	vscode.commands.executeCommand("testing.clearTestResults");


	// we could include all these in a single glob and use a single runner, but keeping them separate 
	// means we can comment them out individually as needed whenever required for debugging purposes.			
	const multis = [
		"../**/project A suite/multi.tests.js",
		"../**/project B suite/multi.tests.js",
		"../**/simple suite/multi.tests.js",
		"../**/run profiles suite/multi.tests.js",
		"../**/multiple top-level features folders suite/multi.tests.js",
		"../**/imported steps suite/multi.tests.js",
		"../**/sibling steps folder 1 suite/multi.tests.js",
		"../**/sibling steps folder 2 suite/multi.tests.js",
		"../**/working dir suite/multi.tests.js",
		"../**/handle bad import suite/multi.tests.js",
		"../**/use custom runner suite/multi.tests.js",
	];

	// because we're creating lots of new runners rather than using one glob, and 
	// each mocha.run will call _addEventListener for uncaughtException and unhandledRejection, so 
	// to stop a MaxListenersExceededWarning being logged, we'll increase the max listeners
	console.log(process.getMaxListeners());
	process.setMaxListeners(multis.length + 1);

	return Promise.all(multis.map(m => runner(m)));


}
