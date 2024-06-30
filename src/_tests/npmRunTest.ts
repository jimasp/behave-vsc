import cp from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';



npmRunTest();


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
      shell: true,
      stdio: 'inherit',
    });
    if (result.error)
      throw result.error;





    console.log("starting test run...");


    // replace platform-specific settings
    const exampleProjectsFolderPath = path.resolve(__dirname, '../../example-projects');
    const exampleProjectFolders = await fs.promises.readdir(exampleProjectsFolderPath);

    for (const projFolder of exampleProjectFolders) {
      const projFolderPath = path.join(exampleProjectsFolderPath, projFolder);
      updateSettingsJsonForPlatform(projFolderPath);
    }

    // 1. run unit tests
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath: path.resolve(__dirname, './unit/index'),
      launchArgs: ["unit tests (no workspace)"]
    });


    // 2. start the multiroot project and run each multi.test.ts file
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath: '"' + path.resolve(__dirname, './integration/multiroot suite/index') + '"',
      launchArgs: ["example-projects/multiroot.code-workspace"]
    });


    // 3. loop through each suite and run each runProjectTests.ts file
    const integrationFolderPath = path.resolve(__dirname, './integration');
    const integrationFolders = await fs.promises.readdir(integrationFolderPath);
    for (const folder of integrationFolders) {
      const projectTests = path.resolve(integrationFolderPath, `${folder}/runProjectTests.js`);
      if (!folder.endsWith(" suite") || !fs.existsSync(projectTests)) {
        console.log(`skipping ${projectTests}`);
        continue;
      }
      const projFolderName = folder.replace(" suite", "");
      const projectLaunchArgs = [`"example-projects/${projFolderName}"`];


      await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath: '"' + projectTests + '"',
        launchArgs: projectLaunchArgs
      });
    }

    console.log("*** Test run complete! ***\n");

  } catch (err) {
    console.error('Failed to run tests, ', err);
    process.exit(1);
  }
}


function updateSettingsJsonForPlatform(projectPath: string) {

  try {
    // Read the settings.json file if there is one
    const settingsPath = path.join(projectPath, ".vscode", "settings.json");
    if (!fs.existsSync(settingsPath))
      return;

    const settings = fs.readFileSync(settingsPath, { encoding: "utf8" });
    console.log(`parsing ${settingsPath}`)
    const settingsJson = JSON.parse(settings);

    if (!settingsJson["python.defaultInterpreterPath"] || !settingsJson["python.defaultInterpreterPath"].includes(".venv"))
      return;

    // Modify the python.defaultInterpreterPath attribute if there is one    
    if (os.platform() === 'win32') {
      settingsJson["python.defaultInterpreterPath"] = ".venv\\Scripts\\python.exe";
    }
    else {
      settingsJson["python.defaultInterpreterPath"] = ".venv/bin/python";
    }

    console.log(`Updating ${settingsPath}`);
    fs.writeFileSync(settingsPath, JSON.stringify(settingsJson, null, 2), { encoding: 'utf8' });
    console.log(`Sucessfully updated ${settingsPath}`);

  }
  catch (error) {
    throw new Error('Failed to update settings.json:' + error);
  }

}


