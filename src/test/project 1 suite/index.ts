import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/project 1 suite/**.test.js");
}