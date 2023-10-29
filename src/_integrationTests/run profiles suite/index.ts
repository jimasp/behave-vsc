import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/run profiles suite/**.test.js");
}
