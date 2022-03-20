import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/workspace-2-suite/**.test.js");
}
