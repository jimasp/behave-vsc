import { runner } from "../index.helper";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const sSuite = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js"]);
	const aSuite = runner("../**/project A suite/**.test.js");
	const bSuite = runner("../**/project B suite/**.test.js", ["../**/project B suite/**.testdebug.test.js"]);
	const rpSuite = runner("../**/run profiles suite/**.test.js", ["../**/run profiles suite/**.testdebug.test.js"]);
	const slSuite = runner("../**/step library suite/**.test.js");
	const mfSuite = runner("../**/multiple steps folders/**.test.js");

	return Promise.all([aSuite, bSuite, sSuite, rpSuite, slSuite, mfSuite]);
}
