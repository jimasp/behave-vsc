import { runner } from "../../runner";

export function run(): Promise<void> {
	return runner("**/simple suite/**.test.js");
}