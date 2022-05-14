import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/workspace-simple-suite/**.test.js");
}
