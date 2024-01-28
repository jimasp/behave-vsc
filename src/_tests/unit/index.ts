import { runner } from "../runner";

export async function run(): Promise<void> {
  await runner("**/unit/**/*.tests.js");
}
