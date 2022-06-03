import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/project A suite/**.test.js");
}
