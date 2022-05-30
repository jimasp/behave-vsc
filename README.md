# Behave VSC

## Pre-release v0.3.0

- This is a pre-release. On each update please make sure to check the [Release notes](https://github.com/jimasp/behave-vsc/releases) for breaking changes.
- A test runner (and debugger) for Python behave tests in vscode
- Built with the native Visual Studio Code Test API  
- Tested on Linux and Windows
- See [Troubleshooting](#troubleshooting) below if you have any problems

### Release notes

- See [here](https://github.com/jimasp/behave-vsc/releases)

---

## Features

- Run or Debug behave tests, either from the test side bar or from inside a feature file.
- Select to run/debug all tests, a nested folder, or just a single feature or scenario.
- Supports multi-root workspaces, so you can run features from more than one project in one instance of vscode.
- Run customisation via extension settings (e.g. `runParallel`, `featuresPath`, `envVarList`, etc.)
- Go to step definition from feature file. (Not shown in the below gif. Right-click inside a feature file on a line containing a step and click "Go to Step Definition"). You can also map a keybinding for this command if you wish (e.g. F12).

![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)

---

## Project requirements

- Extension activation requires at least one `*.feature` file somewhere in a workspace.
- No conflicting behave extension is enabled
- A compatible directory structure (see below)
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/)

### Required project directory structure

- A single `features` (lowercase by default) folder somewhere, which contains a `steps` folder. (You don't have to call it "features" - read on, but behave requires you have a "steps" folder.)
- A behave-conformant directory structure, for example:

```text
  . features/  
  .       +-- environment.py
  .       +-- steps/  
  .       |      +-- *.py  
  .       +-- web_tests/  
  .       |      +-- *.feature  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
```

- If your features folder is not called "features", or is not in the workspace root, then you can add a `behave.ini` or `.behaverc` file to your workspace folder and add a `paths` setting and then update the `featuresPath` setting in extension settings. This is a relative path to your project folder. Example:

```text
# behave.ini
[behave]
paths=behave_tests/features

// settings.json
{ 
  "behave-vsc.featuresPath": "behave_tests/features" 
}
```

---

## Extension settings

- This extension has various options to customise your test run via `settings.json`, e.g. `runParallel`, `featuresPath`, `envVarList`, etc.
- You can also disable/enable `justMyCode` for debug (via `settings.json` not `launch.json`).
- If you are using a multi-root workspace with multiple projects that contain feature files, you can set up default settings in your `*.code-workspace` file, then optionally override these as required in the `settings.json` in each workspace folder.
- For more information on available options, go to the extension settings in vscode.

---

## How it works

### How test runs work

- The python path is obtained via the `ms-python.python` extension (exported settings) and is read before each run, so it is kept in sync with your project.

- When running all tests *and* the "RunAllAsOne" extension setting is enabled (the default), it runs this command:  
`python -m behave`

- When running tests one at a time, the extension builds up a separate command for each test and runs it. For example:  
`python -m behave -i "features/myfeaturegroup/myfeature.feature" -n "^my scenario$"`

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
- *Why am I not seeing any exceptions while debugging?* Do you have the appropriate breakpoint settings in vscode, e.g. do you have "Raised Exceptions" etc. turned off?
- *How do I clear test results?* This isn't that obvious in vscode atm. You have to click the ellipsis `...` at the top of the test side bar and then click "Clear all results".
- *Where is the behave junit output stored?* In a temp folder that is deleted (recycled) each time the extension is started. The path is displayed on startup in the Behave VSC output window. (Note that if your test run uses runParallel, then multiple files are created for the same feature via a separate folder for each scenario. This is a workaround to stop the same file being written multiple times for the same feature, which in runParallel mode would stop us from being able to update the test because behave writes "skipped" (not "pending") by default for tests that are not yet complete.)
- *When will this extension have a release version?* When the code is stable. At the moment the code is subject to rewrites/refactoring which makes bugs more likely.

---

## Troubleshooting

### If you have used a previous version of this extension

- Please read through the [release notes](#release-notes) for breaking changes. If that does not resolve your issue, then please rollback to the previous working version via the vscode uninstall dropdown and raise an [issue](https://github.com/jimasp/behave-vsc/issues).
  
### Otherwise

- Does your project meet the [Project Requirements](#project-requirements) and have the [Required project directory structure](#required-project-directory-structure)?
- If you have set the `featuresPath` in extension settings, make sure it matches the paths setting in your behave configuration file.
- Have you tried *manually* running the behave command that is logged in the Behave VSC output window?
- If you are getting different results running all tests vs running a test separately, it's probably down to lack of test isolation.
- Do you have the correct extension [settings](#extension-settings) for your project? (See [Q&A](#Q&A) for information on how to see your effective settings.)
- Do you have runParallel turned on? Try turning it off.
- Do you have the latest version of the extension installed? The problem may have been fixed in a newer release. (Please note that the latest version you can install is determined by your vscode version, so you may need to update vscode first.)
- Check if the problem is in [Known Issues](#known-issues-and-limitations)
- Does your project match the [Tested with](#tested-with) environment tested for this release? (Older releases are available from from the uninstall dropdown in vscode, or in [github](https://github.com/jimasp/behave-vsc/releases) (github contains information on which software versions they were tested with).
- Try temporarily disabling other extensions.
- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues). github [issues](https://github.com/jimasp/behave-vsc/issues).
- The extension is only tested with a couple of example projects. It's possible that something specific to your project/setup/environment is not accounted for. See [Contributing](CONTRIBUTING.md) for instructions on debugging the extension with your own project. (If you debug with your own project, also check whether the same issue occurs with the example project workspaces.)

---

## Known issues and limitations

- There is currently a [bug](https://github.com/microsoft/vscode/issues/149328) in vscode when you hit the "Run Tests" button (or equivalent command) that causes: (a) skipped tests not to update when there are multiple test extensions active, and (b) the test run not to end/update results in a multi-root project when there are multiple test extensions active. A workaround is simply not to use the "Run Tests" button, i.e. run a parent test node instead.
- Test side bar refresh button may be duplicated if more than one test extension is active, (this isn't really an issue as such, you may actually prefer it. MS have a [fix](https://github.com/microsoft/vscode/issues/139737), but it requires *other* test extension authors to update their code (this extension has applied the fix).
- "Go to Step" context menu doesn't always match correctly (and never will). This is because there are a lot of ways to specify step matching and parameters in behave - `parse`;`re`;`cfparse`, and we would have to recreate these matching algorithms exactly.
- "Go to step" context menu will only find steps that are in `.py` files in a folder called `steps` that is in your features folder (e.g. if you import steps in python from a steps library folder it won't find them).
- vscode always adds up test durations. For parallel runs this means the parent test node reports a longer time than the test run actually took.
- Running debug against *multiple* test targets at once starts a fresh debug session for each test (because a separate behave process is started for each test). This can cause some minor UI side effects like having to click debug stop button multiple times. If you are running multiple debug targets at once and you want to stop them, you can either just use the test run stop button instead, or use a keyboard shortcut for debug stop and hit that a couple of times, the default is Shift+F5.

---

## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.
