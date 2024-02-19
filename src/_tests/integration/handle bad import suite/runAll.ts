import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
	return runner("**/handle bad import suite/*.tests.js");
}
