import { runner } from "../../runner";


export function run(): Promise<void> {
	return runner("**/use custom runner suite/*.tests.js");
}