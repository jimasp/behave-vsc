import { runner } from "../../runner";

export function run(): Promise<void> {
  return runner("**/imported steps suite/project.tests.js");
}
