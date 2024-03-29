import { runner } from "../../runner";

export function run(): Promise<void> {
	return runner("**/sibling steps folder 2 suite/*.tests.js");
}
