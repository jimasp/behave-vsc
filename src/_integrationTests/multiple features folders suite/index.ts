import { runner } from "../index.helper";

export function run(): Promise<void> {
  return runner("**/multiple features folders suite/**.test.js");
}
