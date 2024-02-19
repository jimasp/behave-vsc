import { runner } from "../../runner";

// called by launch.json
export function run(): Promise<void> {
  return runner("**/multiple top-level features folders suite/*.tests.js");
}
