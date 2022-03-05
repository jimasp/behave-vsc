import * as cp from 'child_process';
import * as path from 'path';
import {
  downloadAndUnzipVSCode,
  runTests  
  //resolveCliPathFromVSCodeExecutablePath,
} from '@vscode/test-electron';


async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    console.log("checking for latest stable vscode...");
    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
    

    console.log("running pip...");
    const result = cp.spawnSync("pip", ["install", "-r", path.resolve(extensionDevelopmentPath + "/requirements.txt")], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    if(result.error)
      throw result.error;

    
    // ? spawing vscode this way this seems to make vscode ignore the working folder argument
    //const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    // console.log("starting vscode...");
    // cp.spawnSync(cliPath,["example-project-workspace-1", "--install-extension", "ms-python.python", "--force"] {
    //   encoding: 'utf-8',
    //   stdio: 'inherit',
    // });
    // if(result.error)
    //   throw result.error;

    console.log("starting test run...")

    let launchArgs = ["example-project-workspace-1", "--install-extension", "ms-python.python", "--force"]    
    let extensionTestsPath = path.resolve(__dirname, './workspace-1-suite/index');
    await runTests({
      vscodeExecutablePath, // Use the previously returned `code` executable
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

    launchArgs = ["example-project-workspace-2", "--install-extension", "ms-python.python", "--force"]        
    extensionTestsPath = path.resolve(__dirname, './workspace-2-suite/index');
    await runTests({
      vscodeExecutablePath, // Use the previously returned `code` executable
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });    
    
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
