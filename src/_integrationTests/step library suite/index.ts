import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/step library suite/**.test.js");
}
