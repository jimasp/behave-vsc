import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/simple 2 suite/**.test.js");
}
