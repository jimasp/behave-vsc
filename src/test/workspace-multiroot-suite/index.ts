import { runner } from "../index.helper";


export async function run(): Promise<void[]> {

	(global as any).multiRootTest = true; //eslint-disable-line @typescript-eslint/no-explicit-any

	const ws1Promise = runner("../**/workspace-1-suite/**.test.js");
	const ws2Promise = runner("../**/workspace-2-suite/**.test.js", ["../**/workspace-2-suite/**.testdebug.test.js"]);
	const ws3Promise = runner("../**/workspace-simple-suite/**.test.js", ["../**/workspace-simple-suite/**.testdebug.test.js"]);

	return Promise.all([ws1Promise, ws2Promise, ws3Promise]);
}
