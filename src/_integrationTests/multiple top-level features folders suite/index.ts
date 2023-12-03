import { runner } from "../index.helper";

export function run(): Promise<void> {
  return runner("**/multiple top-level features folders suite/**.test.js");
}
