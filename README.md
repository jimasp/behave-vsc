# Behave VSC

- A test runner, debugger and navigator for Python behave tests in vscode
- Built with the native Visual Studio Code Test API
- Please see [troubleshooting](#troubleshooting) if you have any problems
- [Release notes](https://github.com/jimasp/behave-vsc/releases)

---

## Features

![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)

- Run or Debug behave tests, either from the test side bar or from inside a feature file.
- Select to run/debug all tests, a nested folder, or just a single feature or scenario.
- Run customisation via extension settings (e.g. `runParallel`, `featuresPath`, `envVarOverrides`, etc.)
- "Go to Step Definition" from inside a feature file. (Default keybinding Alt+F12.)
- "Find All Step References" from inside a step file. (Default keybinding Alt+F12.)
- Quickly navigate between steps in the Step References Window. (Default keybindings F4 + Shift F4.)
- Supports multi-root workspaces, so you can run features from more than one project in a single instance of vscode. (Each project folder must have its own distinct features/steps folders.)

---

## Workspace requirements

- No conflicting behave extension is enabled
- Extension activation requires at least one `*.feature` file somewhere in the workspace
- A compatible directory structure (see below)
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/)

### Required project directory structure

- A single `features` folder (lowercase by default), which contains a `steps` folder. You don't have to call it "features" - read on, but behave requires you have a folder called "steps". (Multiple features folders are allowed in a multi-root workspace, but only one per project.)
- A *behave-conformant* directory structure, for example:

```text
  . my-project
  .    +-- behave.ini
  .    +-- features/  
  .       +-- environment.py
  .       +-- steps/  
  .       |      +-- *.py  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
  .       +-- web_tests/  
  .       |      +-- *.feature 
  .       |      +-- steps/
  .       |         +-- *.py    
```

- If your features folder is not called "features", or is not in the workspace root, then you can add a behave config file (e.g. `behave.ini` or `.behaverc`) to your workspace folder and add a `paths` setting and then update the `featuresPath` setting in extension settings to match. This is a relative path to your project folder. For example:

```text
# behave.ini
[behave]
paths=my_tests/behave_features

// settings.json
{ 
  "behave-vsc.featuresPath": "my_tests/behave_features" 
}
```

---

## Extension settings

- This extension has various options to customise your test run via `settings.json`, e.g. `runParallel`, `featuresPath`, `envVarOverrides`, etc.
- You can also disable/enable `justMyCode` for debug (via `settings.json` not `launch.json`).
- If you are using a multi-root workspace with multiple projects that contain feature files, you can set up default settings in your `*.code-workspace` file, then optionally override these as required in the `settings.json` in each workspace folder.
- For more information on available options, go to the extension settings in vscode.

---

## How it works

### How test runs work

- The python path is obtained via the `ms-python.python` extension (exported settings) and is read before each run, so it is kept in sync with your project.

- When running all tests *and* the "RunAllAsOne" extension setting is enabled (the default), it runs this command:  
`python -m behave --show-skipped`

- When running tests one at a time, the extension builds up a separate command for each test and runs it. For example:  
`python -m behave --show-skipped -i "features/myfeaturegroup/myfeature.feature" -n "^my scenario$"`

- For each run, the *equivalent* behave command to run the test manually appears in the Behave VSC output window. (The *actual* command run includes `--junit` and `--junit-directory` parameters, but these are not displayed.)
- The behave process is spawned, and behave output is written to the Behave VSC output window for the associated workspace.
- The extension parses the junit file output and updates the test result in the UI, and any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.
- You can adjust the run behaviour via extension settings in your `settings.json` file (e.g. `runParallel` etc.)

### How debug works

- It dynamically builds a debug launch config with the behave command and runs that. (This is a programmatic equivalent to creating your own debug launch.json and enables the `ms-python.python` extension to do the work of debugging.)
- You can control whether debug steps into external code via the extension setting `behave-vsc.justMyCode` (i.e. in your `settings.json` *not* your `launch.json`).
- Behave error output (only) is shown in the debug console window. (This is to reduce noise when debugging. Run the test instead if you want to see the full behave output.)
- The extension parses the junit file output and updates the test result in the UI, and any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.

---

## Q&A

- *How can I see all effective settings for the extension?* On starting vscode, look in the Behave VSC output window.
- *How do I clear previous test results?* This isn't that obvious in vscode. Click the ellipsis `...` at the top of the test side bar and then click "Clear all results".
- *Why does the behave command output contain `--show-skipped`?* This flag must be enabled for junit files (which the extension depends on) to be produced for skipped tests. It is enabled by default, so this override is there *just in case* your behave.ini file specifies `show_skipped=False`.
- *How can I only execute specific tags while using the extension?* You can use the `tags=` setting in your behave.ini file. However this will not avoid the overhead associated with starting a behave process for each test, i.e. it will only be faster when either (a) you have runAllAsOne enabled and you run all tests in the workspace at once, or (b) you are effectively skipping slow tests. (If you regularly execute a subset of tests, consider if you can group them into folders, not just by tag, then you can select to run a folder from the test tree in the UI instead.)
- *How can I see the active behave config being used for behave execution?* In your behave config file, set `verbose=true`.
- *Why can't I see print statements in the Behave VSC output window even though I have `stdout_capture=False` in my behave config file?* Because the extension depends on the `--junit` behave argument. As per the behave docs, with this flag set, all stdout and stderr will be redirected and dumped to the junit report, regardless of the capture/no-capture options. If you want to see print statements, copy/paste the the outputted command and run it manually (or run `python -m behave` for all test output).
- *Where is the behave junit output stored?* In a temp folder that is deleted (recycled) each time the extension is started. The path is displayed on startup in the Behave VSC output window. (Note that if your test run uses runParallel, then multiple files are created for the same feature via a separate folder for each scenario. This is a workaround to stop the same junit file being written multiple times for the same feature, which in runParallel mode would stop us from being able to know the result of the test, because each parallel behave execution would rewrite the file and mark scenarios not included in that execution as "skipped".)
- *When will this extension have a release version?* When the code is more stable. At the moment the code is subject to rewrites/refactoring which makes bugs more likely.

---

## Troubleshooting

### If you have used a previous version of this extension

- Please read through the [release notes](#release-notes) for breaking changes. If that does not resolve your issue, then please rollback to the previous working version via the vscode uninstall dropdown and raise an [issue](https://github.com/jimasp/behave-vsc/issues).
  
### Otherwise

- Does your project meet the [workspace requirements](#workspace-requirements) and have the [required project directory structure](#required-project-directory-structure)?
- If you have set the `featuresPath` in extension settings, make sure it matches the `paths` setting in your behave configuration file.
- Did you set extension settings in your user settings instead of your workspace settings?
- Have you tried *manually* running the behave command that is logged in the Behave VSC output window?
- If you are getting different results running all tests vs running a test separately, then it is probably due to lack of test isolation.
- If you are not seeing exceptions while debugging a test, do you have the appropriate breakpoint settings in vscode, e.g. do you have "Raised Exceptions" etc. turned off?
- Do you have the correct extension [settings](#extension-settings) for your project? (See [Q&A](#Q&A) for information on how to see your effective settings.)
- Does restarting vscode solve your issue?
- Do you have runParallel turned on? Try turning it off.
- Do you have the latest version of the extension installed? The problem may have been fixed in a newer release. (Please note that the latest version you can install is determined by your vscode version, so you may need to update vscode first.)
- Check if the problem is in [Known Issues](#known-issues-and-limitations)
- Try temporarily disabling other extensions.
- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues).
- Does your environment match the one tested for this release? You can check the environment tested for each release in [github](https://github.com/jimasp/behave-vsc/releases) and downgrade as required.
- Any extension errors should pop up in a notification window, but you can also look at debug logs and error stacks by enabling `xRay` in the extension settings and using vscode command "Developer: Toggle Developer Tools".
- The extension is only tested with a few example projects. It's possible that something specific to your project/setup/environment is not accounted for. See [Contributing](CONTRIBUTING.md) for instructions on debugging the extension with your own project. (If you debug with your own project, you may also wish to check whether the same issue occurs with one of the example project workspaces.)

---

## Known issues and limitations

- There is currently a [bug](https://github.com/microsoft/vscode/issues/149328) in vscode itself when you hit the "Run Tests" button (or equivalent command) and multiple test extensions are enabled, this causes: (a) skipped tests not to update (they are shown as "not yet run"), and (b) the test run not to end/update results in a multi-root project when there are multiple test extensions active. A workaround is simply not to use the "Run Tests" button, i.e. run tests from a test tree node instead (e.g. "Feature Tests")
- Test side bar refresh button may be duplicated if more than one test extension is active, (this isn't really an issue as such, you may actually prefer it. MS have a [fix](https://github.com/microsoft/vscode/issues/139737), but it requires *other* test extension authors to update their code (this extension has applied the fix).
- vscode always adds up test durations. For parallel runs this means the parent test node reports a longer time than the test run actually took.
- Running debug against *multiple* test targets at once starts a fresh debug session for each test (because a separate behave process is started for each test). This can cause some minor UI side effects like having to click debug stop button multiple times. If you are running multiple debug targets at once and you want to stop them, you can either just use the test run stop button instead, or use a keyboard shortcut for debug stop and hit that a couple of times, the default is Shift+F5.
- Step navigation limitations ("Go to Step Definition" and "Find All Step References"):
  - Step matching does not always match as per behave. It uses a simple regex match via replacing `{foo}` -> `{.*}`. As such, it does *not* consider typed parameters like `{foo:d}`, or `cfparse` cardinal parameters like `{foo:?}` or `re` regex matching like `(?P<foo>foo)`.
  - Step navigation only finds steps that are in `.py` files in a folder called `steps` that is in your features folder (e.g. if you import steps in python from a steps library folder outside your steps folder it won't find them).

---

## Contributing

If you would like to submit a pull request, please see the  [contributing](CONTRIBUTING.md) doc.
