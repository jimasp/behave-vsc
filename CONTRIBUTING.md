# CONTRIBUTING

## Developing/Debugging this extension

---

### General

- ***This extension is currently in pre-release. Feel free to raise an issue, but pull requests are unlikely to be accepted until we reach Release v1.0.0 due to code volatility.*** (You should also hold off forking before v1.0.0).
- Before starting any development, please make sure to *fully read through both the [README](README.md) and this document*. It may save you some development pain and/or solve your issue.
- If you are going to be developing/debugging this extension, then disable the installed (marketplace) version of the extension. Leaving the extension enabled while debugging the extension can cause confusing side-effects via background execution.
- If you want to contribute to this extension, please read through everything below, then fork the repo, make your changes, and submit a pull request.
- This code is under the MIT licence (i.e. you are free to fork it and do your own thing as long as the [LICENSE](LICENSE.txt) is included), but please do contribute bug fix PRs to the [original repo](https://github.com/jimasp/behave-vsc).
- Bug fixes are great. New features will be considered, but see [Development guidelines](#development-guidelines).

---

### Development environment setup for extension development

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
9. Check that all tests pass BEFORE opening visual studio code. This will confirm your environment is set up correctly before you start development.
    - `npm run test`
10. If any of the tests fail, then double-check the steps above. Otherwise, you can debug them - see [Debugging integration tests](#debugging-integration-tests) further down.
11. Note - if at any point you perform a `git clean`, or pull a new version of the source code, or switch branch, you will need to run `npm install` again.

---

### Terminology

- The "source" environment refers to the instance of vscode that contains the Behave VSC source code.
- The "host" environment refers to the instance of vscode that that says "Extension Development Host" in the title bar, i.e. the instance that is spawned by clicking the run button in the source environment.

---

### Debugging with the example projects

1. Set up your development environment as above.
2. Make sure you have disabled the marketplace version of the extension.
3. Open vscode, and open the behave-vsc source folder (close any other folders you have open).
4. If you are using windows, and vscode is set to use powershell for terminal scripts, then you may need to enable powershell scripts to run, e.g. `Set-ExecutionPolicy RemoteSigned`. (You will know if this is an issue because vscode will pop up a powershell error message when you try to debug the extension when it tries to run `npm.ps1`.)
5. (`Ctrl+Shift+B`) to build and kick off a watch (this is optional as it will happen anyway, but you should do it if it's your first-ever debug).
6. (Optional) set breakpoints in the extension code, e.g. start with a breakpoint in `src/extension.ts activate` function.
7. (`Ctrl+Shift+D`) to open the Run and Debug side bar.
8. Disable "raised/caught exceptions" if you have them enabled.
9. Click one of the "Debug" targets, e.g. "Debug: Simple workspace" (if a "Debug..." is the current selection, you can just hit (`F5`) from anywhere).
10. Tips:
    - You can relaunch the extension from the debug toolbar in the (source not host) vscode environment after changing extension code. Alternatively, you can reload (`Ctrl+R`) the vscode host environment to load your changes.
    - If for some reason you need to have "uncaught exceptions" enabled in the (source, not host) vscode environment, note that you may need to hit play multiple times in the extension vscode environment to continue if it hits external code.

## Debugging with your own host project

- Remember to disable the extension.
- Open `.vscode/launch.json` in the extension repo project and change the `args` setting that contains `"${workspaceFolder}/../my-project"` to repoint it at your project path.
- Then it's the same steps as above, just click "Debug - MY workspace"
- You probably want to enable `behave-vsc.xRay` in your settings.json so you get diagnostic logs in debug console

---

## Running integration tests

Either:

- a. (`Ctrl+Shift+D`) and click one of the "Run Test Suite" targets (if a "Run Tests..." is the current selection, you can just hit (`F5`) from anywhere)
OR  
- b. Close vscode and excecute `npm run test` from a command line.

---

## Debugging integration tests

1. Optional - hit (`Ctrl+Shift+B`) to build and kick off a watch.
2. Open the debug viewlet (`Ctrl+Shift+D`) and from the launch configuration dropdown pick `Run Test Suite: Simple workspace`.
3. Optionally add a breakpoint in e.g. `runAllTestsAndAssertTheResults`.
4. Hit play or press `F5` to run the tests in a new window with your extension loaded.
5. See the output of the test result in the debug console (in your original source environment, not the host environment).
6. To debug `npm run test` itself (as opposed the test suite), see the comment in `runTestSuites.ts`.  
If you want to add a test, they should go somewhere in `src/test`.
    - The provided test runner will only consider files matching the name pattern `**.test.ts`.
    - You can create folders inside the `test` folder to structure your tests.

---

## Development guidelines

- Always consider performance. This is arguably the most important concern for any editor plugin. (Remember to look out for background (unawaited) functions taking too long or using too much CPU/memory. Use `performance.now` and `diagLog` to log timings where needed.)
- YAGNI - don't be tempted to add new extension functionality the majority of people don't need. More code means more stuff that can break and/or lead to slower performance. Edge-case capabilities should be in forked repos. (If you think it's a *common* concern for users, then please submit a feature request issue or PR.) Also consider that any new functionality needs lots of testing, automated tests if possible, and documentation updates.
- The user should get the same results if they run the outputted behave command manually. Don't attempt to modify/intercept or overcome any limitations of standard behave behaviour. If the outputted command does not result in the same behaviour as running it in the extension, then this is a bug.
- No reliance on other extensions except `ms-python.python`.
- KISS - "It just works" - simple, minimal code to get the job done that is easily understood by others. It doesn't have to be pretty, but it does have to work.
- Don't reinvent the wheel - leverage `vscode` methods (especially for paths) wherever possible, and if necessary standard node functions.
- Regardless of the above point, don't add extra npm packages. We want to keep the extension lightweight, and avoid versioning/security/licensing/audit problems. (Feel free to use packages that already exist in the `node_modules` folder if required.)
- Always consider multi-root workspaces, i.e. there can be different workspace settings per workspace folder, window settings can be changed in a `*.code-workspace` file, output channels are per workspace folder (to stop parallel test runs being merged and to make info and warnings contextual), workspaces folders may be added/removed by the user at run time requiring reload of the test tree, etc.
- Avoid anything that might break on someone else's machine - for example don't rely on bash/cmd, installed programs etc.
- Always consider cross-platform, i.e. consider that windows max path is 259 characters, consider OS drive/path separators, e.g. `C:\...` vs `/home/...`. Use `getUriMatchString()` or `urisMatch()` to compare uris (do not use `uri.path` or `uri.fsPath` for equality checks). Use `uri.path` internally, and `uri.fsPath` for file operations. Use `relativePattern` for file searches. Do not use `path.join` (outside of integration tests), use `vscode.Uri.joinPath` instead. Also consider `/` vs `\` in any pattern matching/replaces etc. (Where possible vscode/node converts `\`to `/` internally for consistency, e.g. with `uri.path`.) Line-endings use `\n`.
- Encoding (use `utf8`).
- While the extension is not internationalised, `Date()` should be avoided, except for `Date().toISOString()` for user output. The `performance` library is used for timings.
- Look out for race conditions. You can have e.g. 3 workspaces running in parallel, and in turn they could all be running parallel tests. (It's a good idea to do all your coding/testing with a multiroot workspace if possible, like the example one provided with this source code.)
- Consider multiple instances of vscode, where the extension could be running twice or more on the same machine. For example, run names have unique ids, so you can be sure they are unique to the vscode instance as well as the workspace.
- Also see [General development notes](#general-development-notes) below.

---

## General development notes

### Configuration

- Configuration and logging is provided by the singleton `config`.

### Disposables

- Any disposable object should either be added to `context.subscriptions.push` or disposed in a `finally` block or in the `deactivate()`. (The most common disposables are event handlers, filesystemwatchers, and cancelllation token sources.)

### Diagnostics

- Diagnostic logs are controlled via the extension setting `behave-vsc.xRay` (this is enabled by default in the example projects and for most integration tests).
- Diagnostics logs are written automatically if you call `config.logger.logInfo` etc., but if you want to write something *only* to diagnostic logs, then use `diagLog()`. These logs can be viewed in the debug console if debugging the extension itself, or otherwise via the vscode command `Developer: Toggle developer tools`.
- Diagnostics inside integration tests should simply use `console.log`.

### Error handling

- Stack traces will only appear if `behave-vsc.xRay` is enabled.
- The most common error handling stack is: `throw "msg"` -> `throw WkspError` -> `config.showError`.
- *Unless you are in a top-level function, i.e. an entry point function, handler or unawaited async function, then errors should be thrown (i.e. do not call showError except in these cases)*. This is so that (a) all parent catches know about the error and can act on it, for example to cancel a test run if required, and (b) the error only gets shown once (at the top of the stack).
- If you are adding a `throw` (or `showError`), then ALWAYS test that error handling works as expected by deliberately throwing the error, i.e. check it gets gets logged correctly, only gets shown once, and has the full expected stack if `xRay` is enabled.
- Entry point (event handlers/hooks) and background tasks (i.e. unawaited async functions/promises) should always contain a `try/catch` with a `config.showError`. Examples are `activate`,`deactivate` and any function called `...Handler` or `onDid...`, or just `on...` (e.g. `onCancellationRequested`). These are the top-level functions and so they need catches.
- Elsewhere `showError` should be avoided. Instead you want to use either `throw my message` or `throw new WkspError(...)`. The second option (`wkspError`) should be used if: (a) there is no `catch` above that creates a `new WkspError` itself, and (b) you have a workspace context (i.e. `wkspSettings` or `wskpUri` is available to the function). Either throw will then then get caught further up the stack, acted on if required and/or logged by the top-level function.
- Any thrown errors are going to reach the user, so they should be things that either (a) the user can act upon to fix like a configuration problem or duplicate test, or (b) exceptions i.e. stuff that is never supposed to happen and should be raised as an issue on github.
- Behave execution errors are not extension exceptions and should be handled, e.g. update test state to failed with a failure message that refers the user to look at the Behave VSC output window or the debug console as appropriate.
- Info appears in the output window. Warnings and Errors appear in the output window and the notification window. All of them will appear in console if `xRay` is enabled.

### Logging

- You should `throw` for errors (see [Error handling](#error_handling)), and `showWarn` for warnings. This will log the error/warning and open a notification window to alert the user.
- Log info to the Behave VSC workspace context output window and any active debug window: `config.logger.logInfo("msg", wkspUri)`. Preferred over `logInfoAllWksps()` wherever possible.
- Log info to all Behave VSC output windows (regardless of workspace): `config.logger.logInfoAllWksps`. *This should only be used where a workspace context does not make sense.*
- Log info to the vscode test run output at the same time: specify the run parameter: `config.logger.logInfo("msg", wkspUri, run)`.
- Log only to the vscode test run output: `run.appendOutput("msg")`.
- Log only for extension developers (contributors) and users who want to see diagnostic output: `diagLog("msg")`.

---

## Troubleshooting

- See troubleshooting section in the main [README](README.md#troubleshooting) for non-development issues.  
- ***Most extension development problems can be resolved by either:***
  - ***(a) removing all breakpoints, or***
  - ***(b) restarting the watch tasks in terminal window, or***
  - ***(c) restarting vscode.***
- Have you remembered to disable the marketplace version of the extension?
- If you are stepping in to external code, then it's likely you either hit the pause button, or you need to remove all breakpoints (e.g. "caught exceptions").
- If an exception is not bubbling, see [Error handling](#error-handling).
- Is the problem actually in another extension (if debugging, check the file path of the file you have you stepped into).
- Have you pulled the latest version of the source code? and if so, have you run a `git clean -fdx` and `npm install`? (make sure you commit/stash any changes first)
- Have you followed all the steps in [Development environment setup for extension development](#development-environment-setup-for-extension-development), including `npm install` if you just pulled?
- Does the issue occur with the example project workspaces, or just in your own project? What is different about your project?
- Have you made any changes yourself? Does e.g. a fresh clone work without your changes?
- If extension integration tests get stuck while running debug tests, disable all breakpoints in the host vscode environment.
- If you get an error running a "Debug: ..." target, try setting a breakpoint at the start of the `activate()` function.
- If you get an error running a "Run Test Suite: ..." target, try setting a breakpoint at the start of the `runAllTestsAndAssertTheResults()` function.
- If you don't hit either above function breakpoint, try putting a breakpoint at the very first (import) line of every `.ts` file and see if it jumps out of debugging, e.g. is there a node module import/webpack issue?
- Delete all breakpoints from both source and host environments if any of the following occur:
  - If you don't hit a breakpoint that you're sure you should be hitting. (This could also be down to sourcemaps and breakpoints being out of sync, in which case restart kill the watch task and then restart it with `Ctrl+Shift+B` - this will run `rimraf out/ dist/`).
  - If `npm run test` fails on the command line due to a timeout.
  - If a "Run Test Suite: ..." test fails during debugging due to a timeout.

---

## Generating the extension installer manually (.vsix file)

If you have a customised fork and you want to distribute it to your team, you will want to create your own .vsix file:

1. `npm install -g vsce` (installs latest version of packaging tool)
2. `vsce package -o ../mypackagefolder/my-behave-vsc.vsix`  (this will also run the tests, if you've already run them you can just close vscode windows when they appear)

---

## Before requesting a PR merge

### Notes

- PRs are unlikely to be accepted before release v1.0.0, but feel free to raise one if it helps to highlight an issue.
- Fixes are given priority over new functionality. Also, new functionality must have automated tests where possible.

### Process

- Fork the repo, make your changes.
- Generally speaking, you should only add files to, not modify, the example project workspaces in your PR.
- Quickly review your code vs the project's [Development guidelines](#development-guidelines)
- Is your bug/use case covered by an existing test, or example project feature file? If not, is it possible to add one so it doesn't break again?
- `git add .` and `git commit -m` your changes if required
- consider if you need to clean up for a valid test run (e.g. check the output of `git clean -fdn`)
- `npm run lint` and fix any errors or warnings
- Test your PR before submission (see below)
- Commit/push your changes to your forked branch.
- Raise an issue describing the problem that the PR is resolving and link the PR in the issue.

#### Testing your PR before submission

#### 1. Run automated tests (to verify behave results and step references)

- Close vscode and run `npm run test`
  - if the tests get stuck on debug, disable the "uncaught exceptions" breakpoint in the host vscode environment
  - if the tests fail, see [Debugging integration tests](#debugging-integration-tests)
  
#### 2. Run basic manual UI tests

- a. start "Debug: multiroot workspace", then in "project A":
- b. clear all test results, Run a single test
- c. clear all test results, Run all feature tests and check that the run stop button works
- d. clear all test results, Set a breakpoint, debug a single test and check it stops on the breakpoint, play it through and check the test result is updated in the test UI tree
- e. remove the breakpoint. clear all test results, Start a debug run of group 1 features and check that debug stop works (you may have to click it more than once or hit Shift+F5 twice)

#### 3. Run change-specific manual UI tests

After running automated tests and the manual UI tests in (2) above, then if you made a change that affects anything other than behave test results then you'll want to run some further manual tests of the *affected areas*.

Example: if you changed anything that affects step navigation/feature file parsing/step file parsing/filesystem watchers/workspace settings, then you'd want to run these manual tests as a minimum:

- A. IMPORTANT: **`git add .` and `git commit -m` your changes** before going further.
- B. consider if you need to clean up for valid testing (e.g. check the output of `git clean -fdn`)
- C. start `Debug: multiroot workspace`
- Then in `project A`:
- D. edit the `group1_features/basic.feature` file, change the name of the `Feature: Basic` to `Feature: Foo` and save it, then:
  - check you can run the renamed feature from inside the feature file (first play/tick button at top of feature file)
  - check the test UI tree shows the renamed feature (you may need to reopen the node)
  - check the old feature name no longer appears in the test UI tree
  - check you can run the renamed feature from UI tree
- E. edit `group1_features/outline_success.feature` file, change the name of `Scenario Outline: Blend Success` to `Scenario Outline: Foo` and save it, then:
  - check you can run the changed scenario from inside the feature file
  - disable raised exceptions if required, put a breakpoint in environment.py and check you can debug the renamed scenario from inside the feature file
  - check the test UI tree shows the renamed scenario (you may need to reopen the node)
- F. open a diff comparison on any feature file you changed (leave the feature file open in another tab)
- G. close vscode, open it again, check that having a feature file open on start up, you can run a scenario from inside the feature file (the normal feature file that is open, not the diff view)
- H. rename the `table.feature` file to `footable.feature` (i.e. rename the file itself), then in the test UI tree, check the feature is not duplicated (i.e. `Table feature` only appears once), then check feature tests run from the feature file, and from the test UI
- I. rename `group1_features` to `group1_features_foo`, in the UI check the folder is renamed and not duplicated, check the renamed feature group tests run from test ui tree
- J. delete `group1_features_foo/outline_success.feature` file, check it gets removed from the test tree
- K. create a new feature file `scen_copy.feature`, then go to `basic.feature` and copy the `Feature: Foo` and the first scenario, copy/paste that text into `scen_copy.feature` and check the feature gets added to the test tree under `group1_features_foo`
- L. copy and paste the `scen_copy.feature` feature file itself into the same `group1_features_foo` folder, and check the feature gets added to the test tree
- In `project B`:
- M. open the `goto_step.feature` feature file and click "go to step definition" on a wrapped (multiline) step near the bottom of the file, and check it works
- N. rename the `goto_step.feature` file to `goto_step_foo.feature` and check you can still use "go to step definition" for a step in that file
- O. in the file that it opened (`features/steps/shared.py`) ALT+F12 or right-click on on `def step_inst(context):` and "Find All Step References" and check that only hits from the project B workspace are returned.
- P. now hit F4 or click on the `basic.feature` file references in the "Step References" window then:
  - note the number of results at the top of the step references window
  - comment out one of the `Given we have behave installed` steps in the `basic.feature` file. save the file and check that the reference window automatically refreshes to remove the reference (the results count should decrement)
  - uncomment the scenario, check it reappears in the step references window (the results should increment)
  - duplicate (copy/paste) a scenario in the feature file and rename it in the feature file to e.g. `scenario 2`. save the file and check that the reference window automatically refreshes to add the new scenario references (the results count should increment)
  - copy/paste the feature file itself into the `features` folder to create a `basic copy.feature` file, go back to the step references window, check that the reference window automatically refreshes to add the new feature file references for `basic copy.feature` (and the results count increases by the amount of scenarios in the file)
- Q. ALT+F12 (or right-click and "go to step definition") on any "given we have behave installed" line, then above `def step_inst(context):` add a couple of blank lines it and save the file. (This will mean there are no results for that line as it has it has moved and the original query is for the now blank line number.)
  - ALT+F12 and check it finds all references again.
  - try clicking on a reference.
  - then try F4 to move to next one.
- R. ALT+F12 on any "given we have behave installed" line, then rename the step function `def step_inst(context):` to `def step_inst_foo(context):` and save the file. check the step references window shows the same results. then ALT+F12 find all references and again check the results are the same.
- S. comment out the step function `def step_inst_foo(context):`, check there are now no results in the step references window. uncomment and check the results reappear.
- T. go to the output window "Behave VSC: project A"
- U. in the file explorer UI, right click `project A` a workspace folder (e.g. "project A") and click "Remove folder from workspace".
  - check there are no error windows pop up. check that you have the output windows for "Behave VSC: project B" and "Behave VSC: simple".
  - check that tests run as expected from all remaining workspaces and show their output in the output windows.
- V. back in the file explorer UI, right-click on an empty area and "Add folder to workspace" and select "project A" to add it back.
  - check that you have the correct output windows for Behave VSC
  - and that tests run as expected from all workspaces.
- Lastly, assuming you committed at step A, use e.g. `git reset --hard` and `git clean -fd` to undo the file changes created by these manual tests.
