import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
	return runner("**/run profiles suite/*.tests.js");
}
