import { runner } from "../index.helper";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const p1 = runner("../**/project 1 suite/**.test.js");
	const p2 = runner("../**/project 2 suite/**.test.js", ["../**/project 2 suite/**.testdebug.test.js"]);
	const ps = runner("../**/simple suite/**.test.js", ["../**/simple suite/**.testdebug.test.js"]);

	return Promise.all([p1, p2, ps]);
}
