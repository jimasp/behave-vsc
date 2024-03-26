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
        - `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash` (command for latest nvm version can be found [here](https://github.com/nvm-sh/nvm#install--update-script))
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
4. Close visual studio code
5. Open a command line window, go to your source folder, and clone the extension source code, example:
    - `cd <mysourcedir>`
    - `git clone https://github.com/jimasp/behave-vsc.git`
6. Change to the cloned directory, and install required node packages:
    - `cd <mysourcedir>/behave-vsc`
    - `npm install`
7. Install the pre-commit hook (linux/mac only):
    - `cp .git_hooks/* .git/hooks/ && chmod +x .git/hooks/*`
8. Install required extensions for developing the extension:  
    - `code --install-extension ms-python.python` (if not already installed)
    - `code --install-extension dbaeumer.vscode-eslint`
    - `code --install-extension amodio.tsl-problem-matcher`
9. Install dependencies for the `use custom runner` example project venv:
    - `cd "example-projects/use custom runner"`
    - `python3 -m venv .venv`
    - `pip install -r requirements.txt`
10. Install behave 1.2.6 globally (most example projects do not have a venv):
    - Change to the root directory: `cd /` (or `cd \` on Windows)
    - `pip install behave==1.2.6`
    - Ensure that this global command works from the root directory: `"python" -m behave --version` (include the quotes)
11. Change back to your repo directory. Check that all tests pass BEFORE opening visual studio code. This will confirm your environment is set up correctly before you start development.
    - `cd <mysourcedir>/behave-vsc`
    - `npm run test`
    - If any of the tests fail, double-check the steps above and look for red text in the output starting from the top and working down. Otherwise, you can debug them - see [Debugging integration tests](#debugging-integration-tests).
12. Note - if at any point you perform a `git clean`, or pull a new version of the source code, or switch branch, you will need to run `npm install` again.

---

### Terminology

- The "source" environment refers to the instance of vscode that contains the Behave VSC extension source code.
- The "host" environment refers to the instance of vscode that that says "Extension Development Host" in the title bar, i.e. the instance that is spawned by clicking the run button in the source environment.
- Also see [terminology](./README.md#terminology) in the README, i.e. the difference between "workspace" and "project".

### Debugging with the example projects

#### Getting your code path to execute

- Because most of the extension code relates to parsing etc., most of the time you can get to your breakpoint either when the host environment starts up, or by hitting the refresh button in the test explorer UI in the host environment.

#### Debugging process

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
    - You can relaunch the extension from the debug toolbar in the source vscode environment after changing extension code. Alternatively, you can reload (`Ctrl+R`) the vscode host environment to load your changes.
    - If for some reason you need to have "uncaught exceptions" enabled in the source vscode environment, then note that this will cause you to step into external code.
11. See the [Troubleshooting](#troubleshooting) section if you are having trouble debugging

## Debugging with your own host project

- Remember to disable the extension.
- Open `.vscode/launch.json` in the extension repo project and change the `args` setting that contains `"${workspaceFolder}/../my-project"` to repoint it at your project path.
- Then it's the same steps as above, just click "Debug - MY workspace".
- You probably want to enable `behave-vsc.xRay` in your settings.json so you get diagnostic logs in debug console in the source environment.
- See the [Troubleshooting](#troubleshooting) section if you are having trouble debugging

---

## Running integration tests

Either:

- a. (`Ctrl+Shift+D`) and click one of the "Integration Tests" targets (if a "Run Tests..." is the current selection, you can just hit (`F5`) from anywhere)
OR  
- b. Close vscode and excecute `npm run test` from a command line.

---

## Debugging integration tests

1. Optional - hit (`Ctrl+Shift+B`) to build and kick off a watch.
2. Open the debug viewlet (`Ctrl+Shift+D`) and from the launch configuration dropdown pick `Integration Tests: Simple workspace`.
3. Optionally add a breakpoint in e.g. `runAllTestsAndAssertTheResults`.
4. Hit play or press `F5` to run the tests in a new window with your extension loaded.
5. See the output of the test result in the debug console (in your original source environment, not the host environment).
6. To debug `npm run test` itself (as opposed the test suite), see the comment in `npmRunTest.ts`.  
If you want to add a test, they should go somewhere in `src/test`.
    - The provided test runner will only consider files matching the name pattern `**.test.ts`.
    - You can create folders inside the `test` folder to structure your tests.
7. See the [Troubleshooting](#troubleshooting) section if you are having trouble debugging

---

## Generating the extension installer manually (.vsix file)

If you have a customised fork and you just want to distribute it to your team, you will want to create your own `.vsix` file:

1. `npm install -g @vscode/vsce` (installs latest version of packaging tool)
2. `vsce package -o ../mypackagefolder/my-behave-vsc.vsix`  (this will also run the integration tests - if you've already run them, then you can just close vscode windows as they appear)

---

## General development notes

### Configuration

- Configuration and logging is provided by the singleton `config`.

### Disposables

- Any disposable object should either be added to `context.subscriptions.push` or disposed in a `finally` block or in the `deactivate()`. (The most common disposables are event handlers, filesystemwatchers, and cancelllation token sources.)

## How autocompletion, highlighting and snippets are hooked up

- feature file autocompletion is provided by:
  - autoCompleteProvider.ts
feature file syntax highlighting is provided by:
  - gherkin.grammar.json
- semHighlightProvider.ts. (only for step parameters and missing steps called by vscode on-demand as required.)
feature file formatting is provided by:
  - gherkin.language-configuration.json - (sets indentation used on typing out a feature file, e.g. pressing enter)
  - formatFeatureProvider.ts - (sets indentation on user request - CTRL K+F, inc. file save if set)

### Diagnostics

- Diagnostic logs are controlled via the extension setting `behave-vsc.xRay` (this is enabled by default in the example projects and for most integration tests).
- Diagnostics logs are written automatically if you call `services.logger.logInfo` etc., but if you want to write something *only* to diagnostic logs, then use `diagLog()`. These logs can be viewed in the debug console if debugging the extension itself, or otherwise via the vscode command `Developer: Toggle developer tools`.
- Diagnostics inside integration tests should simply use `console.log`.

### Exception handling

- The following notes are regarding exceptions raised from extension code *itself*. Behave execution errors are not extension exceptions and should always be handled, (e.g. update the test state to failed with a failure message that refers the user to look at the Behave VSC output window or the debug console as appropriate).
- Any thrown errors are going to reach the user, so they should be things that either:
  - (a) the user can act upon to fix themselves, or
  - (b) actual "exceptions", i.e. "stuff that is never supposed to happen" (a bug) and should be raised as an issue on github.
- The most common error handling stack is: `throw new Error("an error message")` -> `throw new projError` -> `services.logger.showError`. (Take a look at `class projError`.)
- `showError` will show the error in a dialog box to alert the user.
- Entry point (event handlers/hooks) i.e. top-level functions, and background tasks (i.e. unawaited async functions/promises) should *always* contain a `try/catch` with a `config.showError`. Examples are:
  - any unawaited async function
  - `activate`,`deactivate`, any function called `...Handler` or `onDid...` or just `on...` (e.g. `onCancellationRequested`)
- Elsewhere `showError` should be avoided. Instead you want to use either `throw new Error("my message")` or `throw new projError(...)`.
- `projError` should be used if:
  - (a) there is no `catch` above that creates a `new projError` itself, AND
  - (b) you have a workspace context (i.e. `pr`, `projSettings` or `projUri` is available to the function).
  Either throw will then then get caught further up the stack, acted on if required and/or logged by the top-level function.
- *Unless you are in a top-level function, i.e. an entry point function, handler or unawaited async function, then errors should be thrown (i.e. do not call showError except in these cases)*. This is so that (a) all parent catches know about the error and can act on it, for example to cancel a test run if required, and (b) the error only gets shown once (at the top of the stack).  
- These are general guidelines. If you are adding a `throw` (or `showError`), then ALWAYS test that error handling works as expected by deliberately throwing the error, i.e. check it gets gets logged correctly, *only gets shown once*, creates an error dialog box to alert the user and has the full expected stack if `xRay` is enabled. i.e. *think about the user experience*.
- Note that stack traces should only appear if `behave-vsc.xRay` is enabled.
- Generally speaking, Info level events appear in the output window. Warnings and Errors appear in the output window and as a notification window. All of them will appear in console if `xRay` is enabled. See [Logging](#logging) for more information.

### Logging

- In the case of errors, should not call the logger. You should `throw` for errors (see [Exception handling](#exception-handling)), and `showWarn` for warnings. This will automatically log the error/warning and open a notification window to alert the user.
- Log info to the Behave VSC project context output window and any active debug window: `services.logger.logInfo("msg", projUri)`. Preferred over `logInfoAllProjects()` wherever possible.
- Log info to all Behave VSC output windows (regardless of project): `services.logger.logInfoAllProjects`. *This should be used sparingly, i.e. only where a project context does not make sense.*
- Log info to the vscode test run output at the same time: specify the run parameter: `services.logger.logInfo("msg", projUri, run)`.
- Log only to the vscode test run output: `run.appendOutput("msg\r\n")`.
- Log only for extension developers (contributors) and users who want to see diagnostic output: `diagLog("msg")`.

---

## Troubleshooting

- See troubleshooting section in the main [README](README.md#troubleshooting) for non-development issues.  
- ***Most extension development problems can be resolved by:***
  - ***First, removing all breakpoints from both the source AND host vscode environments, and then either:***
  - ***(a) deleting the "watch" tasks terminal window(s), or***
  - ***(b) restarting vscode.***
- General:
  - Have you remembered to disable the marketplace version of the extension?
  - Is the problem actually in another extension? (if debugging, check the file path of the file you have you stepped into).  
  - Have you pulled the latest version of the source code? and if so, have you run a `git clean -fdx` and `npm install`? (make sure you commit/stash any changes first)
  - Have you followed all the steps in [Development environment setup for extension development](#development-environment-setup-for-extension-development), including `npm install` if you just pulled?
  - Does the issue occur with the example project workspaces, or just in your own project? What is different about your project?
  - Have you made any changes yourself? Does e.g. a fresh clone work without your changes?
  - If extension integration tests get stuck while they are running a debug behave test run, remember to also disable all breakpoints in the *host* vscode environment.
- Debugging:
  - If you are stepping in to external code, then it's likely you either hit the pause button, or you need to remove all breakpoints (e.g. "caught exceptions").
  - If an exception is not bubbling, see [Exception handling](#exception-handling).
  - If you get an error running a "Debug: ..." target, try setting a breakpoint at the start of the `activate()` function.
  - If you get an error running a "Integration Tests: ..." target, try setting a breakpoint at the start of the `runAllTestsAndAssertTheResults()` function.
  - If you don't hit either above two function breakpoints, try putting a breakpoint at the very first (import) line of every `.ts` file and see if it jumps out of debugging, e.g. is there a node module import/webpack issue?
  - Delete all breakpoints from both source *and* host environments if *any* of the following occur:
    - If you don't hit a breakpoint that you're sure you should be hitting. (This could also be down to sourcemaps and breakpoints being out of sync, in which case delete the "watch" terminal window(s) and then afterwards restart it with `Ctrl+Shift+B` - this will run `rimraf out/ dist/`).
    - If `npm run test` fails on the command line due to a timeout.
    - If a "Integration Tests: ..." test fails during debugging due to a timeout.
  - It's rare (i.e. it's normally one of the above issues, not this) but there are a few lines that you can never set a breakpoint on, e.g. something like `await mypromises`. If this happens, then when you start debugging you will see vscode move the breakpoint to the next line that it can break on.

---

## Development guidelines

---

### Guidelines

- Always consider performance. This is arguably the most important concern for any editor plugin. (Remember to look out for background (unawaited) functions taking too long or using too much CPU/memory. Use `performance.now` and `diagLog` to log timings where needed.)
- YAGNI - don't be tempted to add new extension functionality the majority of people don't need. More code means more stuff that can break and/or lead to slower performance. Edge-case capabilities should be in forked repos. (If you think it's a *common* concern for users, then please submit a feature request issue or PR.) Also consider that any new functionality needs lots of testing, automated tests if possible, and readme updates.
- The user should get the same results if they run the outputted behave command manually. Don't attempt to modify/intercept or overcome any limitations of standard behave behaviour. If the outputted command does not result in the same behaviour as running it in the extension, then this is a bug.
- No reliance on other extensions except `ms-python.python`.
- KISS - "It just works" - simple, minimal code to get the job done that is easily understood by others. It doesn't have to be pretty, but it does have to work.
- Don't reinvent the wheel - leverage `vscode` methods (especially for paths) wherever possible, and if necessary standard node functions.
- Regardless of the above point, don't add extra npm packages. We want to keep the extension lightweight, and avoid versioning/security/licensing/audit problems. (Feel free to use packages that already exist in the `node_modules` folder if required.)
- Always consider multi-root workspaces, i.e. there can be different project settings per project folder, window (instance) settings can be changed in a `*.code-workspace` file, output channels are per project folder (to stop parallel test runs being merged and to make info and warnings contextual), project folders may be added/removed by the user at run time requiring reload of the test tree, etc.
- Avoid anything that might break on someone else's machine - for example don't rely on bash/cmd, installed programs etc.
- Always consider cross-platform, i.e. consider that windows max path is 259 characters, windows max command line length is 8191 characters, consider OS drive/path separators, e.g. `C:\...` vs `/home/...`. Use `getUriMatchString()` or `urisMatch()` to compare uris (do not use `uri.path` or `uri.fsPath` for equality checks). Use `uri.path` internally, and `uri.fsPath` for file operations. Use `relativePattern` for file searches. Do not use `path.join` (outside of integration tests), use `vscode.Uri.joinPath` instead. Also consider `/` vs `\` in any pattern matching/replaces etc. (Where possible vscode/node converts `\`to `/` internally for consistency, e.g. with `uri.path`.) Line-endings use `\n`.
- Encoding (use `utf8`).
- While the extension is not internationalised, `Date()` should be avoided, except for `Date().toISOString()` for user output. The `performance` library is used for timings.
- Look out for race conditions. You can have e.g. 3 projects running in parallel, and in turn they could all be running parallel tests. (It's a good idea to do all your coding/testing with a multiroot workspace if possible, like the example one provided with this source code.)
- Consider multiple instances of vscode, where the extension could be running twice or more on the same machine. For example, run names have unique ids, so you can be sure they are unique to the vscode instance as well as the project.
- Also see [General development notes](#general-development-notes) below.

---

## Before requesting a PR merge

### Notes

- PRs are unlikely to be accepted before release v1.0.0, but feel free to raise one if it helps to highlight an issue.
- Fixes are given priority over new functionality. Also, new functionality must have automated tests where possible.

### Process

- Fork the repo, make your changes.
- *Generally* speaking, you should only add files to, not modify, existing example projects in your PR.
- Quickly review your code vs the project's [Development guidelines](#development-guidelines)
- Is your bug/use case covered by an existing test, or example project feature file? If not, is it possible to add one so it doesn't break again?
- `git add .` and `git commit -m` your changes if required
- Consider if you need to clean up for a valid test run (e.g. check the output of `git clean -fdn`)
- Make your changes locally. Add integration tests if needed.
- Did you remember to check performance? Most importantly do your changes spike CPU/memory usage?
- `npm run lint` and fix any errors or warnings
- Test your PR before submission (see below)
- Commit/push your changes to your forked branch.
- Raise an issue describing the problem that the PR is resolving and link the PR in the issue.

### Testing your PR before submission

Depending on the nature and size of your PR, you'll normally want to run some tests.
Note that again, depending on the nature of the change, you will want to run these tests on both Windows and Linux, especially if your changes involve file paths, environment variables, etc. (Supported operating systems are Ubuntu and Windows.)

#### 1. Run automated tests

(approx time required: 3m)

Note that the automated tests are currently quite primitive and *only* verify the most important functionality, i.e. behave test results and step references. They do not verify other built-in convenience features like automatic feature file reparsing, file autoformatting, autocompletion, syntax highlighting, etc. which should be tested manually if you have touched those or related areas. The automated tests also do not test how the behave command is built up to match user test selection, so again if you have changed that you will need to test it manually.

- First to make sure the tests are running with a clean environment, ***make sure you have committed all your changes***, then run the following commands:
  
  ```bash
  git status
  git pull origin main
  npm install -g npm@latest
  git clean -fdx
  npm install 
  npm audit fix 
  ```

- Open vscode, and *Make sure you do NOT have the marketplace version of the extension installed*
- Close vscode and run `npm run test`
  - if the tests get stuck on debug, disable the "uncaught exceptions" breakpoint in the host vscode environment
  - if the tests fail, see [Debugging integration tests](#debugging-integration-tests)
  
#### 2. Run basic manual UI tests

(approx time required: 10m)

- *Make sure you do NOT have the marketplace version of the extension installed*
- a. start `Debug: multiroot workspace`, then in the test UI (i.e. the side panel), in `project A`:
- b. clear all test results, run a single scenario in `project A` from the test UI
- c. clear all test results, debug a single scenario in `project A` from the test UI
- d. clear all test results, run a single scenario in `project A` from the > button inside the feature file
- e. clear all test results, debug a single scenario in `project A` right click the > button inside the feature file
- f. clear all test results, run a feature in `project A` from the >> button inside the feature file
- g. clear all test results, debug a feature in `project A` right click the >> button inside the feature file
- h. clear all test results, run `Feature Tests` node, check success/fail/skip across all projects are as expected
- i. clear all test results, run `project A/nested1` node, expand the nested nodes, check success/fail/skip
- i. clear all test results, run `project B/nested` node, expand the nested nodes, check success/fail/skip
- j. clear all test results, collapse all tests, run `Feature Tests` node and check that the run stop button works (this may not react immediately, but you should only have to press it once to stop the test run)
- k. clear all test results, debug `Feature Tests` node, click back to the testing panel, and check that the run stop (not the
debug stop) button works
- l. clear all test results, debug a `Project A` node, check that the debug stop button works - you should only have to press it once
- m. clear all test results, in the file explorer go to `project A/behave tests/some tests/steps/shared.py` set a breakpoint in `step_inst` function on the `pass` line, debug a single scenario in `project A` and check it stops on the breakpoint, play it through and check the test result is updated in the test UI tree
- n. remove the breakpoint. clear all test results, start a debug run of `group 1 features` and check that the debug stop button works
- o. start a debug run of unit tests (not feature tests) and check that debug stop button works
- p. go to any feature file, check that `go to step` works using `F12`
- q. in the steps file that just opened, check that `find all step references` works using `ALT`+`F12`, then check that `F4` and `Shift`+`F4` navigate the references list

#### 3. Run *change-specific* manual UI tests

(varies, but approx time required for the below checks: 20m)

After running automated tests and the manual UI tests in (2) above, then if you made a change that affects anything other than behave test results then you'll want to run some further manual tests of the *affected areas*.

Example: if you changed anything that affects any of step navigation/feature file parsing/step file parsing/filesystem watchers/instance or project settings, then you'd want to run these manual tests as a minimum:

- i.  IMPORTANT:
  - a. *Make sure you do NOT have the marketplace version of the extension installed*
  - b. if you have any changes you want to save, then e.g. **`git add .` and `git commit -m` your changes** before going further.
- ii. consider if you need to clean up for valid testing (e.g. check the output of `git clean -fdn`)
- ii. start `Debug: multiroot workspace`

- Then in `project A`:
  - A. type the word `given` in the feature file, check that the autocompletion list appears
  - B. edit the `behave_tests/some_tests/group1_features/basic.feature` file, change the name of the `Feature: Basic` to `Feature: Foobar`, then:
    - clear all test results in the test explorer UI
    - check you can run the renamed feature from inside the feature file using the >> button
    - right click the > button inside the feature file and click "Reveal in test explorer", check the test UI tree shows the renamed feature
    - type in "Basic" in the test explorer UI filter box, check the old feature name only appears for project B (not project A)
    - type in "Foobar" and click the >> run tests button at the top of the test explorer UI, then delete the "Foo" filter and check that only the Foobar tests ran
  - C. edit `group1_features/outline_success.feature` file, change the name of `Scenario Outline: Blend Success` to `Scenario Outline: Foo`, then:
    - check you can run the changed scenario from inside the feature file
    - disable raised exceptions if required, open `behave_tests/some_tests/environment.py` and put a breakpoint on the `if "skip` line
    - back in the `outline_success.feature` file, right click the > button and "Debug Test" check you can debug the renamed scenario from inside the feature file
    - in the feature file, right click the > button inside the feature file and click "Reveal in test explorer", check the test UI tree shows the renamed scenario outline
  - D. using the source control UI, open a diff comparison on any feature file you changed (leave the associated feature file open in another tab, and open the non-diff tab). now close the vscode host environment, open it again by starting `Debug: multiroot workspace`, check that while having the previous feature file open on start up, you can run a scenario from inside the feature file (the normal feature file that is open, not the diff view)
  - E. in file explorer UI, rename the `table.feature` file to `foo.table.feature` (i.e. rename the file itself)
    - in the test UI tree, filter by "table" and check that under project A only one `Table feature` appears
    - check that the feature from the renamed file runs from the test UI
    - clear all test results, and check that renamed feature runs from inside the feature file using the >> button
  - F. in file explorer UI, rename the `group1_features` folder to `group1_features_foo`,
    - in the test UI filter by `group1`, check that the folder is renamed and not duplicated
    - check the renamed feature group folder runs from test ui tree
    - open one of the `group1_features_foo` feature files, right-click on a step check in , check `Go to Step Definition" works
  - G. delete `group1_features_foo/outline_success.feature` file, check it gets removed from `group1_features_foo` in the test tree
  - H. in file explorer UI, create a new feature file `scen_copy.feature`, then go to `basic.feature` and copy the `Feature: Foobar` and the first scenario, copy/paste that text into `scen_copy.feature` and then in the test UI check that a second `Foobar` feature gets added to the test tree under `group1_features_foo`
  - I. in file explorer UI, copy and paste the `scen_copy.feature` feature file itself into the same `group1_features_foo` folder, and and then in the test UI check the feature gets added to the test tree, i.e. you should see three `Foobar` features
  - J. in the test ui, remove the filter, run `group2_features`. open the `Behave VSC: project A` output window and check that the behave command parameter is: `-i "behave tests/some tests/group2_features/"`
  - K. in the test ui, in `group1_features_foo` under `Mixed outline` select `Blenders Success <thing>` and `Blenders Success "<thing>"`, then select `Table feature`, `Text block`. run the tests then open the `Behave VSC: project A` output window and check that the behave commands have their `i/n` parameters set as follows:
    - `-i "behave tests/some tests/group1_features_foo/outline_mixed.feature$" -n "^Blenders Success ".*" -- @|^Blenders Success .* -- @"`
    - `-i "behave tests/some tests/group1_features_foo/foo.table.feature$|behave tests/some tests/group1_features_foo/textblock.feature$"`
  - L. in the

- SWITCHING to `project B`:

  - A. edit the `features/basic.feature` file, change the name of the `Feature: Basic` to `Feature: Boo`, then:
    - clear all test results in the test explorer UI
    - check you can run the renamed feature from inside the feature file using the >> button
    - right click the > button inside the feature file and click "Reveal in test explorer", check the test UI tree shows the renamed feature
  - B. in file explorer UI, open the `features/goto_step.feature` feature file and right click on one of the `wrapped step` steps near the bottom of the file and `Go to Step Definition"`. check it goes to the correct definition in the `goto_step.feature.py` file
  - C. in file explorer UI, rename the `features/goto_step.feature` file to `goto_step_foo.feature` and check you can still use `Go to Step Definition` for a step in that file
  - D. in file explorer UI, open `features\steps\__init__.py`, go to the line `def step_inst(context):` and right-click and `Find All Step References` and check that only hits from the `project B` project are returned
  - E. in the `Step references` window, look at the `textblock.feature` file references:
    - also note the number of results at the top of the `Step references` window (`x results in y files`)
    - click on one of the `textblock.feature` results, then comment out the line you are taken to
    - check that the reference window automatically refreshes to remove the reference (the results count should decrement)
    - uncomment the step, check it reappears in the step references window (the results count should increment)
    - duplicate (copy/paste) a scenario in the feature file and rename it in the feature file to e.g. `Scenario: run a failing textblock test2`
    - check that the reference window automatically refreshes to add the step reference in the new scenario (the results count should increment)
    - check you can `F4` and `Shift`+`F4` through the step references for `textblock.feature`
    - save the file
    - in the file explorer UI, copy/paste the `textblock.feature` file itself into the `features/grouped` folder to create a `textblock copy.feature` file, go back to the step references window, check that the reference window automatically refreshes to add the new feature file references for `textblock copy.feature` (and the results count increases by the amount of scenarios in the file)
  - F. in the new file, choose any `Given we have behave installed` line, right-click and `Go to Step Definition`. now add a couple of blank lines directly above the `def step_inst(context):` line. (This will mean there are no results for that line as it has moved and the original query is for the now blank line number.)
    - right-click and `Find all Step References` on the `def step_inst(context):` line and check it finds all step references again.
    - try clicking on a reference to check it navigates correctly
  - G. F12 on any `Given we have behave installed` line, then rename the step function `def step_inst(context):` to `def step_inst_foo(context):`. check the step references window is unchanged (shows the same results). then right-click and `Find All Step References` and again check the results are the same.
  - H. comment out the step function `def step_inst_foo(context):`, check there are now no results in the step references window. uncomment and check the results reappear.
  - I. in the test ui, run `grouped`. open the `Behave VSC: project B` output window and check that separate behave instances are started for each feature, for example: `-i "features/grouped/table.feature$"`
  - J. in the test ui, in `grouped` select `Duplicate` and `Table feature`, then under `Mixed outline` select `Blenders Success` and `Blenders Fail` and run the tests. open the `Behave VSC: project B` output window and check that there are thee behave commands with their `i/n` parameters set as follows (output order may vary because Project B runs in parallel):
  - `-i "features/grouped/outline_mixed.feature" -n "^Blenders Fail -- @|^Blenders Success -- @"`
  - `-i "features/grouped/duplicate.feature$"`
  - `-i "features/grouped/table.feature$"`

- THEN:

  - X. go to the output window `Behave VSC: project A`
  - Y. in the file explorer UI, right click `project A` workspace folder (e.g. "project A") and click `Remove folder from workspace`.
    - the original `project A` output window should close
    - check there are no error windows pop up. check that the dropdown has output windows for `Behave VSC: simple` and `Behave VSC: project B`(but not `project A`).
    - in the test UI, check that tests run as expected from `simple` and `project B`
    - check that tests show their output in the output windows `Behave VSC: project B` and `Behave VSC: simple`
  - Z. click vscode's "File" menu and "Add folder to workspace...", double click `project A` to add it back.
    - check that you have output windows `Behave VSC: project A`, `Behave VSC: project B` and `Behave VSC: simple` (sometimes vscode can glitch and duplicate dropdown items temporarily, but selecting an item from the dropdown should remove any duplicates)
    - check that tests run from `simple` and `project B` and update their output windows

- Lastly, we need to undo the file changes created by these manual tests
  - assuming you committed at step A, check you are in the project root, and use e.g. `git reset --hard` and `git clean -fd`
