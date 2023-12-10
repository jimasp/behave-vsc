//import * as fs from "fs";
import { runner } from "../runner";
//import { unitTestWkspFolderFsPath } from "./unitTestHelpers";

export async function run(): Promise<void> {
  await runner("**/unit/**.tests.js");

  // // clean up unit test workspace
  // const files = fs.readdirSync(unitTestWkspFolderFsPath);
  // console.log(unitTestWkspFolderFsPath);
  // for (const file of files) {
  //   if (file !== "do NOT put .feature files in here.txt")
  //     fs.unlinkSync(`unit test workspace/${file}`);
  // }
}
