import { runner } from "../../runner";

export function run(): Promise<void> {
  return runner("**/project B suite/project.tests.js");
}