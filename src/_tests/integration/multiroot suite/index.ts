import { runner } from "../../runner";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const sSuite = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js"]);
	const aSuite = runner("../**/project A suite/**.test.js");
	const bSuite = runner("../**/project B suite/**.test.js", ["../**/project B suite/**.testdebug.test.js"]);
	const rpSuite = runner("../**/run profiles suite/**.test.js", ["../**/run profiles suite/**.testdebug.test.js"]);
	const mtlfSuite = runner("../**/multiple top-level features folders suite/**.test.js");
	const isSuite = runner("../**/imported steps suite/**.test.js");
	const sf1Suite = runner("../**/sibling steps folder 1 suite/**.test.js");
	const sf2Suite = runner("../**/sibling steps folder 2 suite/**.test.js");

	return Promise.all([aSuite, bSuite, sSuite, rpSuite, isSuite, mtlfSuite, sf1Suite, sf2Suite]);
}
