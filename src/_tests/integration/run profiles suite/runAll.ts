import { runner } from "../../runner";


export function run(): Promise<void> {
	return runner("**/run profiles suite/*.tests.js");
}
