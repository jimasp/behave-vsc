import { runner } from "../../runner";

export function run(): Promise<void> {
  return runner("**/working dir suite/project.tests.js");
}
