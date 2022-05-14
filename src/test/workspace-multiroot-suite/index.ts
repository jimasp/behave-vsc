import { runner } from "../index.helper";


export async function run(): Promise<void[]> {
	const ws1Promise = runner("../**/workspace-1-suite/**.test.js");
	const ws2Promise = runner("../**/workspace-2-suite/**.test.js", ["../**/workspace-2-suite/**.testdebug.test.js"]);
	const ws3Promise = runner("../**/workspace-simple-suite/**.test.js", ["../**/workspace-2-suite/**.testdebug.test.js"]);
	return Promise.all([ws1Promise, ws2Promise, ws3Promise]);
}
