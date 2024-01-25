import { runner } from "../../runner";


// MULTIROOT SUITE SPECIFIES ITS OWN TEST FILE GLOBS (AND IGNORES) SUCH THAT
// WE RUN PROJECTS IN PARALLEL (TO SIMULATE runMultiRootProjectsInParallel=True).
export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const sSuite = runner("../**/simple suite/multi.test.js");
	const aSuite = runner("../**/project A suite/multi.test.js");
	const bSuite = runner("../**/project B suite/multi.test.js");
	const rpSuite = runner("../**/run profiles suite/multi.test.js");
	const mtlfSuite = runner("../**/multiple top-level features folders suite/multi.test.js");
	const isSuite = runner("../**/imported steps suite/multi.test.js");
	const sf1Suite = runner("../**/sibling steps folder 1 suite/multi.test.js");
	const sf2Suite = runner("../**/sibling steps folder 2 suite/multi.test.js");
	const wdSuite = runner("../**/working dir suite/multi.test.js");

	return Promise.all([aSuite, bSuite, sSuite, rpSuite, isSuite, mtlfSuite, sf1Suite, sf2Suite, wdSuite]);
}
)