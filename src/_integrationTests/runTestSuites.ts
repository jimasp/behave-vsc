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

// Helper function to convert Windows long paths with spaces to short (8.3) format
// This works around a bug in @vscode/test-electron v2.5.2 where paths with spaces
// are not properly quoted when passed to VS Code with shell:true on Windows
function getShortPathOnWindows(longPath: string): string {
  if (process.platform === 'win32' && longPath.includes(' ')) {
    const result = cp.execSync(`for %I in ("${longPath}") do @echo %~sI`, {
      encoding: 'utf-8',
      shell: 'cmd.exe'
    });
    return result.trim();
  }
  return longPath;
}

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
    // On Windows, if cliPath ends with .cmd, we need to use cmd.exe to run it
    const isWindows = process.platform === 'win32';
    const isCmdFile = cliPath.endsWith('.cmd');
    const result = isWindows && isCmdFile
      ? cp.spawnSync('cmd.exe', ['/c', cliPath, ...args, "--install-extension", "ms-python.python"], {
        encoding: 'utf-8',
        stdio: 'inherit',
      })
      : cp.spawnSync(cliPath, [...args, "--install-extension", "ms-python.python"], {
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    if (result.error)
      throw result.error;


    console.log("starting test run...");

    let launchArgs = [""];
    let extensionTestsPath = "";


    launchArgs = ["example-projects/simple"];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './simple suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = [`"example-projects/sibling steps folder 1"`];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './sibling steps folder 1 suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = [`"example-projects/sibling steps folder 2"`];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './sibling steps folder 2 suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = [`"example-projects/sibling steps folder 3"`];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './sibling steps folder 3 suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = [`"example-projects/project A"`];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './project A suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = [`"example-projects/project B"`];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './project B suite'));
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-projects/multiroot.code-workspace"];
    extensionTestsPath = getShortPathOnWindows(path.resolve(__dirname, './multiroot suite'));
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