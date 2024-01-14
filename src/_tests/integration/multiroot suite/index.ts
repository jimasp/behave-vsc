import { runner } from "../../runner";


// MULTIROOT SUITE SPECIFIES ITS OWN TEST FILE GLOBS (AND IGNORES) SUCH THAT
// WE RUN PROJECTS IN PARALLEL (TO SIMULATE runMultiRootProjectsInParallel=True).
export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	// the second parameter to runner() is an array of files to ignore
	const sSuite = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js", "../**/simple suite/**.runScenarios.test.js"]);
	const aSuite = runner("../**/project A suite/**.test.js");
	const bSuite = runner("../**/project B suite/**.test.js", ["../**/project B suite/**.testdebug.test.js"]);
	const rpSuite = runner("../**/run profiles suite/**.test.js", ["../**/run profiles suite/**.testdebug.test.js"]);
	const mtlfSuite = runner("../**/multiple top-level features folders suite/**.test.js");
	const isSuite = runner("../**/imported steps suite/**.test.js");
	const sf1Suite = runner("../**/sibling steps folder 1 suite/**.test.js");
	const sf2Suite = runner("../**/sibling steps folder 2 suite/**.test.js");
	const wdSuite = runner("../**/working dir suite/**.test.js", ["../**/working dir suite/**.testdebug.test.js"]);

	return Promise.all([aSuite, bSuite, sSuite, rpSuite, isSuite, mtlfSuite, sf1Suite, sf2Suite, wdSuite]);
}
