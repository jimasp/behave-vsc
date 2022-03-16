# CONTRIBUTING

## Developing/Debugging this extension

---
### General
- Before starting any development, please fully read through the [README](README.md) as well as this document. It may solve/answer your issue.
- If you are going to be developing/debugging this extension, uninstall the packaged extension from vscode. (Generally, you can develop the extension 
without doing this, but it is not recommended as there could be side-effects.)
- If you want to contribute to the extension, read through everything below, then fork the repo, make your changes, and submit a pull request.
- If you do wish to contribute, please make sure to read "Design principles" and "Before pushing a PR"
- This code is under the MIT licence. You are free to fork it and do your own thing as long as the LICENSE.txt is included, but please do 
contribute bug fix PRs to the [original repo](https://github.com/jimasp/behave-vsc).
- Fixes > Features.

---
### Development environment setup for extension development:
- **Perform ALL these steps _OUTSIDE_ of visual studio code**
- It is assumed that you have already installed python 3.9.x and the `ms-python.python` extension
1. Close visual studio code
2. Download the source code
	- e.g. `git clone https://github.com/jimasp/behave-vsc.git`
3. Change to the cloned directory, 
	- e.g. `cd /mysourcedir/behave-vsc`
4. Uninstall the packaged extension (optional, but recommended):
	- `code --uninstall-extension jimasp.behave-vsc` 
5. Install node (via nvm) if you need to. See official nvm [doc](https://github.com/nvm-sh/nvm#install--update-script), but example commands are:
	- Linux: 
		- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash` (command for latest version can be 
		found [here](https://github.com/nvm-sh/nvm#install--update-script))
		- `source ~/.bashrc && source ~/.bash_profile && source ~/.profile`
		- `nvm install --lts`
		- `nvm use --lts`		
	- Windows: 
		- Use the installer from https://github.com/coreybutler/nvm-windows/releases
		- Open a fresh **new** admin cmd prompt
		- `nvm install latest`
		- `nvm use latest`
6. Install required node packages
	- `cd <extension_project_folder>`
	- `npm install`
7. Optional - install behave 1.2.6 if required:  
	- `python -m pip install behave==1.2.6` 
8. Install required extensions for developing the extension:  
	- `code --install-extension ms-python.python`
	- `code --install-extension dbaeumer.vscode-eslint`
	- `code --install-extension amodio.tsl-problem-matcher`
9. Check it all works before opening visual studio code:  
	- `npm run test`
10. (If at any point you perform a `git clean`, you will need to run `npm install` again.)

---
### Debugging the extension with the example projects
1. Set up your development environment as above.
2. Open vscode, and open the behave-vsc source folder (close any other folders you have open).
3. (`Ctrl+Shift+B`) to build and kick off a watch (this is optional as it will happen anyway , but you should do it if it's your first ever debug).
4. (Optional) set breakpoints in the extension code, e.g. start with a breakpoint in `src/extension.ts activate` function.
5. (`Ctrl+Shift+D`) to open the Run and Debug panel.
6. Disable "caught exceptions" if you have it enabled.
7. Click the "Debug Extension" target (if "Debug Extension" is the current selection, you can just hit (`F5`) from anywhere).
7. Tips:
 	- You can relaunch the extension from the debug toolbar in the (original not host) vscode environment after changing extension code. 
	 Alternatively, you can reload (`Ctrl+R`) the vscode host environment to load your changes.
 	- If for some reason you need to have "uncaught exceptions" enabled in the (extension, not host) vscode environment, note that you may need to hit play 
	 multiple times in the extension vscode environment to continue. 

## Debugging with your own host project
- To debug using a different host project, open `.vscode/launch.json` in the extension projet and change the `args` setting 
`"${workspaceFolder}/example-project-workspace-1"` repoint it at your project path. 

---
## Running extension integration tests
Either:  
- a. (`Ctrl+Shift+D`) and click the "Run Extension Test Suite" target (if "Extension Tests" is the current selection, you can just hit (`F5`) 
from anywhere)  
OR  
- b. Close vscode and excecute `npm run test` from a command line.

---
## Debugging/adding integration tests
1. Optional - hit (`Ctrl+Shift+B`) to build and kick off a watch.
2. Open the debug viewlet (`Ctrl+Shift+D`) and from the launch configuration dropdown pick `Run Extension Test Suite`.
3. Optionally add a breakpoint in e.g. `runAllTestsAndAssertTheResults`.
4. Hit play or press `F5` to run the tests in a new window with your extension loaded.
5. See the output of the test result in the debug console (in your original vscode window, not the host window).
If you want to add a test, they should go somewhere in `src/test`.
  - The provided test runner will only consider files matching the name pattern `**.test.ts`.
  - You can create folders inside the `test` folder to structure your tests.


---
## Generating the extension installer manually (.vsix file)
If you have a custom fork and you want to distribute it to your team, you will want to create your own .vsix file:
1. `npm install -g vsce` (installs latest version of packaging tool)
2. `vsce package -o ../mypackagefolder`

---
## Troubleshooting
- See troubleshooting section in the main [README](README.md#troubleshooting) for non-development issues.  
- Do you have the latest version of the source code?
- If you get an error debugging "Run Extension", set a breakpoint at the beginning of the `extension.ts` activate function.
- If you get an error debugging "Extension Tests", set a breakpoint at the beggining of the `extension.test.ts` suite function.
- If you don't hit either function breakpoint, try putting a breakpoint at the very first line of every `.ts` file and see if it jumps out 
of debugging, e.g. if there is a webpack/import issue.
- If `npm run test` fails on the command line, it could be a timeout, removing all breakpoints from both enviroments.
- If the "Extension Tests" debug test fails, it could be a timeout, removing all breakpoints from both enviroments.
Specific problem:
- Is the problem actually in another extension - which code are you in? Try disabling other extensions.
- Does the issue occur with the example project workspaces, or just in your own project? What is different about your proect? 
- Have you made any changes yourself? If so, can you e.g. stash/backup your changes and do a `git clean -fxd` and pull latest?

---
## Before requesting a PR merge
- Raise an issue describing the problem that the PR is resolving and link it in the issue
- Quickly review your code vs the project's [Design principles](#design-principles)
- Is your bug/use case covered by an existing test? If not, is it possible to add one so it doesn't break again?
- `npm run lint` and fix any errors (errors must be fixed, warnings should be fixed unless they would result in changes to `extension.ts`.)
- Automated tests (verify behave results):
	- Close vscode and run `npm run test` (currently these only verify test results, they do not test any UI interactions)
- After running automated tests, if you made a change that affects anything other than test results then you'll want to run some manual tests of 
the affected areas. For example, if you changed feature file parsing or file watchers you'd want to run these tests as a minimum:
	1. run example-project-workspace-1
	2. edit a group1 feature file, change the name of the feature and save it, then: 
		- check the test UI tree shows the renamed feature
		- check you can run the renamed feature from inside the feature file
	3. edit a group2 outline feature file, change the name of a scenario and save it, then: 
		- check the test UI tree shows the renamed scenario
		- check you can run the changed scenario from inside the feature file
		- check you can debug the renamed scenario from inside the feature file
	4. open a diff comparison on the feature file you changed (leave the feature file open in another tab)
	5. close vscode, open it again, check that having a feature file open on start up, you can run a scenario from inside the feature file 
	(the normal feature file that is open, not the diff view)

---
## Design principles
- KISS:
	- Easiest method for run/debug possible (i.e. leverage launch.json do not create/attach a debug server yourself, and let MS python 
	extension/behave do the work wherever possible).
	- "It just works" - avoid anything that might break on someone else's box, for example don't rely on bash or file paths (Windows v Linux).
	- YAGNI - simple, minimal code to get the job done, and don't add features people don't need that could break stuff.
- Code concerns:
	- Cross-platform, i.e. OS-independent drive/path separators (`C:\...` vs `/home/...`), line-endings (use `\n`), encoding (use `utf8`), etc. Also
	consider relative paths and path matching. (where possible vscode/node  converts `\`to `/` itself for consistency.)
	- Leverage `vscode` methods and node functions (e.g. `fs` lib) to handle the above concerns, don't code it yourself.
	- No reliance on other extensions except `ms-python.python`.	
	- Try not to add any npm packages - lightweight, less security/licensing/audit concerns.
	- Where possible, try to limit changes to `extension.ts` to new implementation rather than changing the existing implementation. 
(Reason - the code was originally based on an [MS sample repo](https://github.com/microsoft/vscode-extension-samples/blob/main/test-provider-sample) - 
so, if vscode event hooks change, or features get added we might just be able to grab the fix/feature via future commits to that file in the MS repo.)

