# Behave VSC 

## Pre-release v0.1.1
- A simple test runner (and debugger) for Python behave tests in vscode
- Built with the native Visual Studio Code Test API  
- See [Project Requirements](#project-requirements), [Known Issues](#known-issues-and-limitations) and [Troubleshooting](#troubleshooting) below if 
you have any problems

### Tested with
- behave 1.2.6
- Python 3.9.7
- Visual Studio Code 1.65.2
- Ubuntu 21.10 (Pop!_OS) / Windows 10

### Release notes
- See [here](https://github.com/jimasp/behave-vsc/releases)

---
## Features

- Debug or Run behave tests from the test workbench, or from inside a feature file.
- Go to step definition from feature file. (Not shown in the below gif. Right-click inside a feature file on a line 
containing a step and click "Go to step"). You can also map a keybinding for this command if you wish e.g. F12.
- Run customisation via extension [settings](#extension-settings).


![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)


---
## Project requirements
- A single vscode workspace folder (this extension does not support "multi-root workspaces")
- No conflicting behave extension is enabled
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/) 

### Required project directory structure
- A single "features" folder somewhere inside your workspace folder. If your features folder has another name, then see `featuresPath` 
in extension [settings](#extension-settings).
- `features` and `steps` folders must be contained somewhere within the vscode workspace working directory (not outside of it).
- A behave-conformant directory structure, for example, a project root `features` folder that contains a `steps` folder and some grouped features 
folders:
```  
  . features/  
  .       +-- steps/  
  .       |      +-- *.py  
  .       +-- web_tests/  
  .       |      +-- *.feature  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
  .       +-- environment.py
```
 - If you don't want your `features` folder in the project root, you can add a `behave.ini` file to your project root 
folder and add a `paths` setting:
```
[behave]
paths=behave_tests/features 
```
- You can also import steps from other folders via python (you should test this manually with behave first):
```  
  . features/  
  .       +-- steps/  
  .       |      +-- import_steps.py  (`from features.web_tests.steps import web_steps`)
  .       +-- web_tests/  
  .       |      +-- steps/
  .       |          +-- web_steps.py
  .       |      +-- *.feature  
  .       +-- storage_tests/  
  .       |      +-- *.feature  
  .       +-- environment.py
```

---
## Extension settings

- This extension has various settings to customise your test run via `settings.json`.  
- For more information, see the extension settings in vscode (click the cog next to Behave VSC in the extension panel).

---  
## How it works

### How test runs work:

- When running all tests _and_ the "RunAllAsOne" extension setting is enabled (the default), it runs this command:  
`python -m behave`

- When running tests one at a time, the extension builds up a separate command for each test and runs it. For example:  
`python -m behave -i "features/myfeaturegroup/myfeature.feature" -n "^my scenario$"`

- The extension then parses the behave output and updates the test result.
- For each run, the equivalent behave command to run the test manually appears in the Behave VSC output window.
- The json output and any errors also appear in the Behave VSC output window.

### How debug works:

- It dynamically builds a debug launch config and runs that. (This enables `ms-python.python` to do the heavy lifting of setting up the debug port etc.)
- The extension then parses the behave output and updates the test result.
- Error output is shown in the debug console window and/or Behave VSC window depending on the nature of the error.
- Unlike running the test, the behave command and behave output is not shown when in debug (to reduce noise). Run the test instead if you want this 
output.

### Notes

The _actual_ behave command that is run has extra parameters for json format, etc. so it knows what output to expect and to ensure it is 
consistent and parseable.

---
## Troubleshooting
If you used a previous version, but you have issues with the latest version, then please rollback to previous version via the vscode uninstall 
dropdown and raise an [issue](https://github.com/jimasp/behave-vsc/issues). Otherwise:
- Have you tried _manually_ running the behave command that is logged in the Behave VSC output window?
- Does your project match the [Project Requirements](#project-requirements) section above?
- If you are getting different results running all tests vs running a test separately, it's probably down to lack of test isolation.
- If you have set the `featuresPath` in extension settings, make sure it matches your behave configuration file.
- Do you have the correct extension [settings](#extension-settings) for your project? Do you have runParallel turned on? Try turning it off. (Also if 
you have removed extension settings from your 
workspace `.vscode/settings.json`, then do you still have any of the extension settings in your 
[user settings json](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations)?)
- Try temporarily disabling other extensions.
- Check if the problem is in [Known Issues](#known-issues-and-limitations) / github [issues](https://github.com/jimasp/behave-vsc/issues).
- Does your project match the [Tested with](#tested-with) environment tested for this release? (Older releases are available from from the uninstall 
dropdown in visual studio code, or in 
[github](https://github.com/jimasp/behave-vsc/releases) (github contains information on which software versions they were tested with).
- The extension is only tested with a couple of example projects. It's quite possible that something specific to your project/setup/environment is 
not accounted for. See [Contributing](#contributing) below for instructions on debugging the extension with your own project. (Does the 
same issue occur with the example project workspaces, or just in your own project?) 
### Q&A
- Why am I not seeing any exceptions while debugging? Do you have the appropriate breakpoint settings in vs code, e.g. do you have 
"Raised Exceptions" etc. turned off?
- How do I clear test results? This isn't that obvious in vscode atm. You have to click the ellipsis "..." at the top of the test panel and then click 
"Clear all results".

---
## Known issues and limitations

- Does not support multiple vscode workspace folders ("multi-root workspaces").
- "Go to Step" context menu doesn't always work or match correctly. This is because there are a lot of ways to specify step matching and parameters 
in behave - parse;  re; cfparse, and we would have to recreate these matching algorithms exactly. 
- "Go to step" context menu will only find steps that are in `.py` files in a folder called `steps` that is in your features foler (e.g. if you 
import steps in python from an external steps library folder it won't find them). 
- Parallel test runs add up durations, making it look like they took longer than they actually did.
- Running debug against _multiple_ test targets at once starts a fresh debug session for each test. This can cause some minor UI side effects like 
having to click debug stop button multiple times. (If for some reason you _regularly_ debug multiple behave test targets at once, you may wish to map 
a keyboard shortcut for debug stop, the default is Shift+F5.) 
- Test panel refresh button is duplicated if more than one test extension is active e.g. pytest tests, (this isn't really an issue as such, you may 
actually prefer it. MS have a [fix](https://github.com/microsoft/vscode/issues/139737), but it requires _other_ test extensions authors to update
their code (this extension has applied the fix).
- In order to ensure that the output is parseable and consistent, the internally executed behave command adds extra parameters to override any 
configured settings that may affect behave output.
- See [Troubleshooting](#troubleshooting) below.
- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues).


---
## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.

