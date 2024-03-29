import { runner } from "../../runner";


export function run(): Promise<void> {
	return runner("**/nested steps folder suite/*.tests.js");
}
