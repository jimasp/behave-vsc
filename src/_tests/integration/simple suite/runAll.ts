import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
	return runner("**/simple suite/*.tests.js");
}
