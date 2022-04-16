# Behave VSC 

## Pre-release v0.2.0

- NOTE to users of previous versions - if the `features` folder is not in your project root, you must now specify your features path in extension settings. 
- A simple test runner (and debugger) for Python behave tests in vscode
- Built with the native Visual Studio Code Test API  
- See [Troubleshooting](#troubleshooting) below if you have any problems

### Tested with
- behave 1.2.6
- Python 3.9.7
- Visual Studio Code 1.66.0
- ms-python.python extension v2022.4.0
- Ubuntu 21.10 / Windows 10

### Release notes
- If the `features` folder is not in your project root, you must now specify your features path in extension settings. 
- See [here](https://github.com/jimasp/behave-vsc/releases)

---
## Features

- Debug or Run behave tests from the test workbench, or from inside a feature file.
- Go to step definition from feature file. (Not shown in the below gif. Right-click inside a feature file on a line containing a step and click "Go to step"). You can also map a keybinding for this command if you wish (e.g. F12).
- Run customisation via extension settings.

![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)


---
## Project requirements
- Extension activation requires at least one `*.feature` file somewhere in your workspace.
- No conflicting behave extension is enabled
- A compatible directory structure (see below)
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/) 

### Required project directory structure
- A single `features` folder somewhere, which contains a `steps` folder. (You don't have to call it "features" - read on, but behave requires "steps".)
- A behave-conformant directory structure, for example:
```  
  . features/  
  .       +-- environment.py
  .       +-- steps/  
  .       |      +-- *.py  
  .       +-- web_tests/  
  .       |      +-- *.feature  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
```
 - If you don't want your `features` folder in the project root, you can add a `behave.ini` or `.behaverc` file to your workspace folder and add a `paths` setting and then update the `featuresPath` setting in extension settings.
```
// settings.json file
"behave-vsc.featuresPath": "behave_tests/features",
"behave-vsc.workingDirectory": "" // (this is optional, empty string defaults to workspace folder root)

// behave.ini file
[behave]
paths=behave_tests/features 
```
- While only one features steps folder is supported by behave, you can import steps from other folders via python (you should test this manually with behave first):
```  
  . features/  
  .       +-- environment.py
  .       +-- steps/  
  .       |      +-- import_steps.py  (`from features.web_tests.steps import web_steps`)
  .       +-- web_tests/  
  .       |      +-- steps/
  .       |          +-- web_steps.py
  .       |      +-- *.feature  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
```
- If your features folder is not called "features" then you will need to set the `featuresPath` in extension settings (and update your `behave.ini`/`.behaverc` file if required).
- If your features folder is not in the root of your workspace folder, then you will need to set the `featuresPath` in extension settings (and update your `behave.ini`/`.behaverc` file if required).
- If you are using a multi-root workspace, then the settings section in the `.workspace` file will override those in workspace folders. In this case, you need to make sure that all your workspaces can work with the same settings, e.g. they all have the same relative features path, same behave.ini setup etc.

---
## Extension settings

- This extension has various settings to customise your test run via `settings.json`, e.g. path settings and `runParallel`. 
- You can also disable/enable `justMyCode` for debug (via `settings.json` not `launch.json`).
- For more information, go to the extension settings in vscode (click the cog next to Behave VSC in the extensions side bar and then choose "Extension Settings" from the context menu).

---  
## How it works

### How test runs work:

- When running all tests _and_ the "RunAllAsOne" extension setting is enabled (the default), it runs this command:  
`python -m behave`

- When running tests one at a time, the extension builds up a separate command for each test and runs it. For example:  
`python -m behave -i "features/myfeaturegroup/myfeature.feature" -n "^my scenario$"`

- For each run, the equivalent behave command to run the test manually appears in the Behave VSC output window.
- The extension then parses the behave output and updates the test result.
- The json output and any errors also appear in the Behave VSC output window.
- How the run works is controlled by you via extension settings in your `settings.json` file (e.g. `behave-vsc.runParallel` etc.)

### How debug works:

- It dynamically builds a debug launch config and runs that. (This enables the `ms-python.python` extension to do the heavy lifting of setting up the debug port etc.)
- The extension then parses the behave output and updates the test result.
- Error output is shown in the debug console window and/or Behave VSC window depending on the nature of the error.
- To reduce noise when debugging, the behave command and behave std output is not shown when in debug. Run the test instead if you want this output.
- Whether debug steps into external code is controlled by you via the extension setting `behave-vsc.justMyCode` (i.e. your `settings.json` not your `launch.json`).

### Notes

The python path is obtained via the `ms-python.python` extension (exported settings) and is read before each run, so it is kept in sync with your project.

The _actual_ behave command that is run has extra parameters for json format, etc. so it knows what output to expect and to ensure it is consistent and parseable.

---
## Troubleshooting
This a pre-release undergoing active development. If you used a previous version of this extension, but you have issues with the latest version, then please check the [release notes](#release-notes). If that does not resolve your issue, then please rollback to the previous working version via the vscode uninstall dropdown and raise an [issue](https://github.com/jimasp/behave-vsc/issues). Otherwise:
- Does your project meet the [Project Requirements](#project-requirements) section above?
- If you have set the `featuresPath` in extension settings, make sure it matches the paths setting in your behave configuration file.
- Have you tried _manually_ running the behave command that is logged in the Behave VSC output window?
- If you are getting different results running all tests vs running a test separately, it's probably down to lack of test isolation.
- Do you have the correct extension [settings](#extension-settings) for your project? 
- Do you have runParallel turned on? Try turning it off. 
(Also if you have removed extension settings from your workspace `.vscode/settings.json`, then do you still have any of the extension settings in your user settings json? 
See [here](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations) for user settings file locations.)
- Do you have the latest version of the extension installed? The problem may have been fixed in a newer release. (Please note that the latest version you can install is determined by your vscode version, so you may need to update vscode first.)
- Try temporarily disabling other extensions. 
- Check if the problem is in [Known Issues](#known-issues-and-limitations)
 - Does your project match the [Tested with](#tested-with) environment tested for this release? (Older releases are available from from the uninstall dropdown in vscode, or in [github](https://github.com/jimasp/behave-vsc/releases) (github contains information on which software versions they were tested with).
- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues). github [issues](https://github.com/jimasp/behave-vsc/issues). 
- The extension is only tested with a couple of example projects. It's quite possible that something specific to your project/setup/environment is not accounted for. See [Contributing](CONTRIBUTING.md) for instructions on debugging the extension with your own project. (Does the same issue occur with the example project workspaces, or just in your own project?) 
### Q&A
- Why am I not seeing any exceptions while debugging? Do you have the appropriate breakpoint settings in vs code, e.g. do you have "Raised Exceptions" etc. turned off?
- How do I clear test results? This isn't that obvious in vscode atm. You have to click the ellipsis `...` at the top of the test side bar and then click "Clear all results".
- When will this extension have a release version? When I have time. At the moment the code is likely to have rewrites/refactoring, and there aren't enough extension tests yet for release confidence.

---
## Known issues and limitations

- "Go to Step" context menu doesn't always work or match correctly and never will. This is because there are a lot of ways to specify step matching and parameters in behave - parse; re; cfparse, and we would have to recreate these matching algorithms exactly. 
- "Go to step" context menu will only find steps that are in `.py` files in a folder called `steps` that is in your features folder (e.g. if you import steps in python from a steps library folder external to your features folder it won't find them). 
- Parallel test runs add up durations, making it look like they took longer than they actually did.
- Running debug against _multiple_ test targets at once starts a fresh debug session for each test. This can cause some minor UI side effects like having to click debug stop button multiple times. (If for some reason you _regularly_ debug multiple behave test targets at once, you may wish to map a keyboard shortcut for debug stop, the default is Shift+F5.) 
- Test side bar refresh button is duplicated if more than one test extension is active e.g. pytest tests, (this isn't really an issue as such, you may actually prefer it. MS have a [fix](https://github.com/microsoft/vscode/issues/139737), but it requires _other_ test extensions authors to update their code (this extension has applied the fix).
- In order to ensure that the output is parseable and consistent, the internally executed behave command must add extra parameters to override any configured settings that may affect behave output.

---
## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.

