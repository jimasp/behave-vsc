import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/workspace-1-suite/**.test.js");
}

// export function run(): Promise<[void, void]> {
// 	const ws1Promise = runner("../**/workspace-1-suite/**.test.js");
// 	const ws2Promise = runner("../**/workspace-2-suite/**.test.js");
// 	return Promise.all([ws1Promise, ws2Promise]);
// }
