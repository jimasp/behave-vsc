import { runner } from "../../runner";

export function run(): Promise<void> {
	return runner("**/handle bad import suite/*.tests.js");
}
