import { runner } from "../../runner";

export function run(): Promise<void> {
  return runner("**/project A suite/project.tests.js");
}