import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/higher steps folder suite/**.test.js");
}
