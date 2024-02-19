import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
	return runner("**/sibling steps folder 1 suite/*.tests.js");
}
