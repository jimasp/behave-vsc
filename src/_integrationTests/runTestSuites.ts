import * as cp from 'child_process';
import * as path from 'path';
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} from '@vscode/test-electron';


// this code handles `npm run test` or `npm run testinsiders`
// to debug this code, add a breakpoint here, then open package.json and click the "Debug >" link 
// and choose "test" or "testinsiders" from the dropdown
// (to debug the tests themselves, just launch from the usual debug link in vscode and select the suite to run)
async function runTestSuites() {
  try {
    const version = process.argv[2].slice(2);
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // console.log("running pip...");
    // const result = cp.spawnSync("pip", ["install", "-r", path.resolve(extensionDevelopmentPath + "/requirements.txt")], {
    //   encoding: 'utf-8',
    //   stdio: 'inherit',
    // });
    // if(result.error)
    //   throw result.error;    

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

    let launchArgs = [""];
    let extensionTestsPath = "";


    launchArgs = ["example-projects/simple"]
    extensionTestsPath = path.resolve(__dirname, './simple suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/sibling steps folder 1"];
    extensionTestsPath = path.resolve(__dirname, './sibling steps folder 1 suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/sibling steps folder 2"];
    extensionTestsPath = path.resolve(__dirname, './sibling steps folder 2 suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/higher steps folder"];
    extensionTestsPath = path.resolve(__dirname, './higher steps folder suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/imported steps"];
    extensionTestsPath = path.resolve(__dirname, './imported steps suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/run profiles"];
    extensionTestsPath = path.resolve(__dirname, './run profiles suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/project A"]
    extensionTestsPath = path.resolve(__dirname, './project A suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/project B"]
    extensionTestsPath = path.resolve(__dirname, './project B suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/multiroot.code-workspace"];
    extensionTestsPath = path.resolve(__dirname, './multiroot suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    console.log("test run complete");

  } catch (err) {
    console.error('Failed to run tests, ', err);
    process.exit(1);
  }
}


runTestSuites();