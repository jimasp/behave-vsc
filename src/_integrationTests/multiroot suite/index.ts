import { runner } from "../index.helper";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const aSuite = runner("../**/project A suite/**.test.js");
	const bSuite = runner("../**/project B suite/**.test.js", ["../**/project B suite/**.testdebug.test.js"]);
	const sSuite = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js"]);

	return Promise.all([aSuite, bSuite, sSuite]);
}
