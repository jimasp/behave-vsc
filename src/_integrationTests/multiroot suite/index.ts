import { runner } from "../index.helper";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const p1 = runner("../**/project A suite/**.test.js");
	const p2 = runner("../**/project B suite/**.test.js", ["../**/project B suite/**.testdebug.test.js"]);
	const ps = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js"]);

	return Promise.all([p1, p2, ps]);
}
