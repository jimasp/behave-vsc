import { runner } from "../../runner";


export function run(): Promise<void> {
	return runner("**/sibling steps folder 1 suite/*.tests.js");
}
