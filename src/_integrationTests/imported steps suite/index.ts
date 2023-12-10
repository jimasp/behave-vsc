import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/imported steps suite/**.test.js");
}
