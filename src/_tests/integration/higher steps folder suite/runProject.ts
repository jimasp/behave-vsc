import { runner } from "../../runner";

export function run(): Promise<void> {
  return runner("**/higher steps folder suite/*.tests.js");
}

