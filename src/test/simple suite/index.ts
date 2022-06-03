import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/simple suite/**.test.js");
}
