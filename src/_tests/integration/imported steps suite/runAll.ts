import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
	return runner("**/imported steps suite/*.tests.js");
}
