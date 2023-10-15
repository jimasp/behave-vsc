import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/sibling steps folder 3 suite/**.test.js");
}
