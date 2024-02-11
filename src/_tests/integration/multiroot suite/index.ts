import * as vscode from "vscode";
import { runner } from "../../runner";
import { testGlobals } from "../_helpers/common";



// MULTIROOT SUITE SPECIFIES ITS OWN TEST FILE GLOBS (AND IGNORES) SUCH THAT
// WE RUN PROJECTS IN PARALLEL (TO SIMULATE runMultiRootProjectsInParallel=True).
export async function run(): Promise<void[]> {

	testGlobals.multiRootTest = true;
	vscode.commands.executeCommand("testing.clearTestResults");

	// we could include all these in a single glob, but it's better to keep them separate 
	// so we can comment them out individually whenever required for debugging etc.

	const sSuite = runner("../**/simple suite/multi.tests.js");
	const aSuite = runner("../**/project A suite/multi.tests.js");
	const bSuite = runner("../**/project B suite/multi.tests.js");
	const rpSuite = runner("../**/run profiles suite/multi.tests.js");
	const mtlfSuite = runner("../**/multiple top-level features folders suite/multi.tests.js");
	const isSuite = runner("../**/imported steps suite/multi.tests.js");
	const sf1Suite = runner("../**/sibling steps folder 1 suite/multi.tests.js");
	const sf2Suite = runner("../**/sibling steps folder 2 suite/multi.tests.js");
	const wdSuite = runner("../**/working dir suite/multi.tests.js");
	const biSuite = runner("../**/handle bad import suite/multi.tests.js");

	return Promise.all([aSuite, bSuite, sSuite, rpSuite, isSuite, mtlfSuite, sf1Suite, sf2Suite, wdSuite, biSuite]);
}
