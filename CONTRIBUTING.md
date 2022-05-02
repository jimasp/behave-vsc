# CONTRIBUTING

## Developing/Debugging this extension

---
### General
- ***This extension is currently in pre-release. Feel free to raise an issue, but pull requests are unlikely to be accepted until we reach Release v1.0.0 due to code volatility.*** You should also hold off forking before v1.0.0, or make sure to merge down updates.
- Before starting any development, please make sure to fully read through both the [README](README.md) and this document. It may save you some development pain and/or solve your issue.
- If you are going to be developing/debugging this extension, then disable the installed (marketplace) version of the extension. Leaving the extension enabled while debugging the extension can cause confusing side-effects via background execution.
- If you want to contribute to the extension, read through everything below, then fork the repo, make your changes, and submit a pull request.
- This code is under the MIT licence (i.e. you are free to fork it and do your own thing as long as the [LICENSE](LICENSE.txt) is included), but please do contribute bug fix PRs to the [original repo](https://github.com/jimasp/behave-vsc).
- Fixes are great. New features will be considered, but see [Design principles](#Design-Principles).

---
### Development environment setup for extension development:
- It is assumed that you have already installed git and Python 3.x.x
- Example commands given for installing external software (nvm, node, python) were correct at the time of writing, but these are likely to go out of date. For external software, you should always check the latest instructions on the official websites.
1. Install node (via nvm) if you don't have it.
	- Linux (bash assumed): 
		- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash` (command for latest version found [here](https://github.com/nvm-sh/nvm#install--update-script))
		- `source ~/.bashrc && source ~/.bash_profile && source ~/.profile`
		- `nvm install --lts`
		- `nvm use --lts`		
	- Windows: 
		- Use the installer [here](https://github.com/coreybutler/nvm-windows/releases)
		- Open a fresh **new** administrator command prompt
		- `nvm install latest`
		- `nvm use latest`
2. Open visual studio code
3. Disable or uninstall the marketplace version of the extension (otherwise you will have two instances of the extension running, and associated side effects)
4. ***Close visual studio code***
5. Open a command line window, go to your source folder, and clone the extension source code, example:
	- `cd mysourcedir`
	- `git clone https://github.com/jimasp/behave-vsc.git`
6. Change to the cloned directory, and install required node packages:
	- `cd mysourcedir/behave-vsc`		
	- `npm install`
7. Install behave 1.2.6 if required:  
	- `python -m pip install behave==1.2.6` 
8. Install required extensions for developing the extension:  
	- `code --install-extension ms-python.python` (if not already installed)
	- `code --install-extension dbaeumer.vscode-eslint`
	- `code --install-extension amodio.tsl-problem-matcher`
9. Check it all works _before_ opening visual studio code. All tests should pass. This will confirm your environment is set up correctly before you start development.
	- `npm run test`
10. If any of the tests fail, then double-check the steps above. Otherwise, you can debug them - see [Debugging integration tests](#debugging-integration-tests) further down.
11. Note - If at any point you perform a `git clean`, pull a new version of the source code, or switch branch, you will need to run `npm install` again.


---
### Debugging with the example projects
1. Set up your development environment as above. 
2. Make sure you have disabled the marketplace extension.
3. Open vscode, and open the behave-vsc source folder (close any other folders you have open).
4. (`Ctrl+Shift+B`) to build and kick off a watch (this is optional as it will happen anyway , but you should do it if it's your first ever debug).
5. (Optional) set breakpoints in the extension code, e.g. start with a breakpoint in `src/extension.ts activate` function.
6. (`Ctrl+Shift+D`) to open the Run and Debug side bar.
7. Disable "raised/caught exceptions" if you have them enabled.
8. Click the "Debug Extension" target (if "Debug Extension" is the current selection, you can just hit (`F5`) from anywhere).
9. Tips:
 	- You can relaunch the extension from the debug toolbar in the (original not host) vscode environment after changing extension code. 
	 Alternatively, you can reload (`Ctrl+R`) the vscode host environment to load your changes.
 	- If for some reason you need to have "uncaught exceptions" enabled in the (extension, not host) vscode environment, note that you may need to 
	 hit play multiple times in the extension vscode environment to continue if it hits external code.

## Debugging with your own host project
- Remember to disable the extension.
- Open `.vscode/launch.json` in the extension repo project and change the `args` setting containing `"${workspaceFolder}/../my-project"` to repoint it at your project path. 
- Then it's the same steps as "Debugging the extension with the example projects"

---
## Running integration tests
Either:  
- a. (`Ctrl+Shift+D`) and click the "Run Extension Test Suite" target (if "Extension Tests" is the current selection, you can just hit (`F5`) from anywhere)  
OR  
- b. Close vscode and excecute `npm run test` from a command line.

---
## Debugging integration tests
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
2. `vsce package -o ../mypackagefolder/my-behave-vsc.vsix`


---
## Troubleshooting
- See troubleshooting section in the main [README](README.md#troubleshooting) for non-development issues.  
- Most development problems can be resolved by either (a) removing all breakpoints, (b) restarting the watch tasks in terminal window, or (c) restarting vscode.
- If you're not hitting a breakpoint, remove _all_ breakpoints and re-add your breakpoint (see below for more info).
- If you are stepping in to external code, then it's likely you either hit pause, or you need to remove all breakpoints.
- If your source goes out of sync with debug, kill any watches in the terminal window to force a rebuild. 
- If you are getting invalid errors in the "problems" window, kill any watch tasks in the terminal window to force a rebuild. If that fails, restart vscode.
- If you get an error running "Debug Extension...", set a breakpoint in the `activate()` function.
- If you get an error running "Run Extension Test Suite...", set a breakpoint in the `runAllTestsAndAssertTheResults()` function.
- If you don't hit either above function breakpoint, try putting a breakpoint at the very first (import) line of every `.ts` file and see if it jumps out of debugging, e.g. is there a node module import/webpack issue? 
- Delete all breakpoints from both extension and host environments if any of the following occur:
	- If you don't hit a breakpoint that you're sure you should be hitting. This may be down to sourcemaps and breakpoints being out of sync (in this case, also consider doing a `git commit` and `git clean fdx`). 
	- If `npm run test` fails on the command line due to a timeout.
	- If the "Run Extension Test Suite" debug test fails due to a timeout.
- Is the problem actually in another extension - _which file path have you stepped into_?
- Have you pulled the latest version of the source code?
- Does the issue occur with the example project workspaces, or just in your own project? What is different about your proect? 
- Have you made any changes yourself? If so, can you e.g. stash/backup your changes and do a `git clean -fxd` and pull latest?

---
## Adding logs
- If you want to log something everywhere, i.e. debug window/ouput window/vscode test output, use `config.logger`, e.g. `config.logger.logInfo(...)`
- If you want to log something only for extension developers (contributors), use `console`, e.g. `console.log(...)`
- If you want to log something only to the vscode test run output, use `run.appendOutput(...)`

---
## Before requesting a PR merge
### Notes
- PRs are unlikely to be merged before release v1.0.0, but feel free to raise one if it helps to highlight an issue.
- Fixes are given priority over new functionality. Also, new functionality _must_ have tests.
- Raise an issue describing the problem that the PR is resolving and link it in the issue
### Process
- Generally speaking, you should not modify the example project workspaces in your PR, unless you are _adding_ new feature/steps files or improving existing tests. (Either way, any changes to the example project workspaces will require you to update the test code for expected results.)
- Quickly review your code vs the project's [Design principles](#design-principles)
- Is your bug/use case covered by an existing test, or example project feature file? If not, is it possible to add one so it doesn't break again?
- `npm run lint` and fix any errors or warnings
- Automated tests (verify behave results):
	- Close vscode and run `npm run test`
- After running automated tests, if you made a change that affects anything other than behave test results then you'll want to run 
some manual tests of the _affected areas_. For example, if you changed feature file/step file parsing or filesystem watchers you'd want to run these manual tests as a minimum:
	1. commit your changes locally (because you are about to make file changes)
	2. start debug on workspace 1, then	
	3. edit a group1 feature file, change the name of the feature and save it, then: 
		- check you can run the renamed feature from inside the feature file (first play button at top of feature file)
		- check the test UI tree shows the renamed feature (you may need to reopen the node)
		- check you can run the renamed feature from UI tree
	4. edit a group1 outline feature file, change the name of a scenario and save it, then: 
		- check you can run the changed scenario from inside the feature file
		- disable raised exceptions if required, put a breakpoint in environment.py and check you can debug the renamed scenario from inside the feature file		
		- check the test UI tree shows the renamed scenario (you may need to reopen the node)
	5. open a diff comparison on the feature file you changed (leave the feature file open in another tab)
	6. close vscode, open it again, check that having a feature file open on start up, you can run a scenario from inside the feature file 
	(the normal feature file that is open, not the diff view)
	7. rename a feature file, in the test side bar, check the feature is not duplicated in the test UI tree, check feature tests run from the feature file, and then the test ui
	8. rename a feature group folder (e.g. 'group1_features'), check the folder is not duplicated, check feature tests run from test ui tree
	9. go to a feature file, click "go to step defintion" and check at least some of them work
	10. rename the same steps file you just used, then check you can still use "go to step definition" for a step in that file

---
## Design principles
- YAGNI - don't be tempted to add new extension functionality the majority of people don't need. More code means more stuff that can break and/or lead to slower performance. Edge-case capabilities should be in forked repos. (If you think it's a common concern, then please do submit a feature request issue or PR.) 
- KISS - "It just works" - simple, minimal code to get the job done that is easily understood by others. 
- Don't reinvent the wheel - leverage `vscode` methods (especially for paths), and if necessary standard node functions, to handle things wherever possible. 
- Regardless of the above point, don't add extra npm packages. We want to keep the extension lightweight, and avoid versioning/security/licensing/audit problems.
- Don't attempt to modify/intercept or overcome any limitations of standard behave behaviour. The user should get the same results if they run the behave command manually. Also any such changes would be more likely to break in future versions of behave.
- Always consider performance.
- Always consider cross-platform, i.e. OS-independent drive/path separators (consider `C:\...` vs `/home/...`), Use `vscode.` functionality like `uri.path` or workspaceFolder etc. wherever possible. Also consider relative paths and path/pattern matching. (Where possible vscode/node converts `\`to `/` itself for consistency.) Line-endings (use `\n` internally, i.e. unless you are handling `\r\n`). Encoding (use `utf8`). 
- Avoid anything that might break on someone else's machine - for example don't rely on bash/cmd, installed programs etc.
- No reliance on other extensions except `ms-python.python`.	
