import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';



// this code handles `npm run test` or `npm run testinsiders`
// (to debug the tests themselves, just launch from the usual debug link in vscode and select the suite to run)
// to debug this code, add a breakpoint here, then open package.json and click the "Debug >" link 
// and choose "test" or "testinsiders" from the dropdown
async function npmRunTest() {
  try {
    const version = process.argv[2].slice(2);
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    console.log("extensionDevelopmentPath", extensionDevelopmentPath);

    console.log(`checking for latest ${version} vscode...`);
    const vscodeExecutablePath = await downloadAndUnzipVSCode(version);


    console.log(`installing ms-python.python extension into ${version} version...`);
    const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const result = cp.spawnSync(cliPath, [...args, "--install-extension", "ms-python.python"], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    if (result.error)
      throw result.error;


    console.log("starting test run...");


    // RATHER THAN RUNNING IN ALPHABETICAL ORDER, WE'LL TRY TO RUN IN A FAIL-FAST ORDER

    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath: path.resolve(__dirname, './unit/index'),
      launchArgs: ["unit tests (no workspace)"]
    });

    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath: path.resolve(__dirname, './integration/multiroot suite/index'),
      launchArgs: ["example-projects/multiroot.code-workspace"]
    });


    // loop through each suite and run runProject.ts
    const integrationFolderPath = path.resolve(__dirname, './integration');
    const integrationFolders = await fs.promises.readdir(integrationFolderPath);
    for (const folder of integrationFolders) {
      const projectTests = path.resolve(integrationFolderPath, `${folder}/runProject.js`);
      if (!folder.endsWith(" suite") || !fs.existsSync(projectTests)) {
        console.log(`skipping ${projectTests}`);
        continue;
      }
      const projFolderName = folder.replace(" suite", "");
      const projectLaunchArgs = [`example-projects/${projFolderName}`];
      await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath: projectTests,
        launchArgs: projectLaunchArgs
      });
    }

    console.log("*** Test run complete! ***\n");

  } catch (err) {
    console.error('Failed to run tests, ', err);
    process.exit(1);
  }
}


npmRunTest();
