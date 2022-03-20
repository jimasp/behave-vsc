import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/workspace-1-suite/**.test.js");
}
