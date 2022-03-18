# Behave VSC 

## Pre-release v0.0.9
- A simple test runner (and debugger) for python behave tests in vscode
- Built with the native Visual Studio Code Test API  
- See [Known Issues](#known-issues) and [Troubleshooting](#troubleshooting) below if you have any problems

### Tested with
- behave 1.2.6, 
- Python 3.9.7
- Visual Studio Code 1.65.2
- Ubuntu (Pop!_OS 21.10) / Windows 10

---
## Features

- Debug or Run behave tests from the test workbench, or from inside a feature file.
- Go to step definition from feature file. (Not shown in the below gif. Right-click inside a feature file on a line 
containing a step and click "Go to step"). You can also map a keybinding for this command if you wish e.g. F12.
- Run customisation via [Extension settings](#extension-settings).


![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)


---
## Project Requirements
- A single vscode workspace folder
- No conflicting behave extension is enabled
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/) 
- A (lowercase) "features" folder somewhere in the project
- A behave-conformant directory structure, e.g. you could have a project root `features` folder that contains a `steps` folder:
```  
  . features/  
  .       +-- steps/  
  .       |      +-- *.py  
  .       +-- group1.features/  
  .       |      +-- *.feature  
  .       +-- group2.features/  
  .       |      +-- *.feature  
```
- Also as per behave standards, if you don't want your `features` folder in the project root, you can add a `behave.ini` file to your project root 
folder and add a `paths` setting:
```
[behave]
paths=behave-tests/features 
```

---
## Extension Settings

- `behave-vsc.envVarList`
  - Default: empty string
  - A _single_-quoted csv list of environment variables to use when calling a behave command.
  - Example `'var1':'val1','var2':'val2'"`
  - You can escape single quotes like this: `'var3':'a value containing a \' quote'` (the escape should be double-slashed `\\'` in the 
  settings.json file itself).

- `behave-vsc.fastSkipList`
  - Default: empty string
  - This setting has no effect when you run all tests at once and `behave-vsc.runAllAsOne` is enabled. 
  - A csv of skip tags that each start with `@` that will stop behave being called for features/scenarios marked with those tags. 
  - Example: `@skip, @skipped` 
  - This is just so you can speed up your test run if you have a large amount of skipped tests. 

- `behave-vsc.runAllAsOne` 
  - Default: true
  - Enables/disables running all tests together, i.e. one-shot `python -m behave` when you run all tests. 
  - Keep this enabled unless (a) you can enable runParallel, or (b) you prefer slower test runs where you can see the test results update as they 
  come in. 
  - Note that running behave as one-shot can cause different test results under some circumstances versus running them individually, e.g. if you 
  set `context.failed` in your tests.

- `behave-vsc.runParallel`
  - Default: false
  - This setting has no effect when you run all tests at once and `behave-vsc.runAllAsOne` is enabled. 
  - Enables/disables running tests in parallel. (Experimental). 
  - It is advised to leave this disabled for your initial test 
run, then change it to enabled if your project test suite supports running multiple tests at the same time, i.e. unless your tests are 
fully **isolated**, then you should not enable this setting. Note that behave itself does not support parallel testing - enabling this setting 
will create multiple behave instances, so in the case of running all tests, it may be no faster due to the overhead of starting multiple processes. 
It will be faster if you select a subset/group of tests to run.  
  - Note that running behave as separate instances can cause different test results from a one-shot run under some circumstances versus running them 
  individually, e.g. if you set `context.failed` in your tests.  
 

---  
## How it works

### How test runs work:

- The extension builds up a separate command for each test and runs it. For example:  
`python -m behave -i "features/myfeaturegroup/myfeature.feature" -n "my scenario"`

- Standard and Error output is shown in the Behave VSC output window, including an equivalent behave command to run the test manually.


### How debug works:

- It dynamically builds a debug launch config and runs that.    
This enables `ms-python.python` to do the heavy lifting of setting up the debug port etc.

- Error output (only) is shown in the debug console window.

---
## Known Issues

- Does not support multiple workspace folders.
- The "Go to Step" feature doesn't always work. (This is because there are a lot of ways to specify step matching and parameters 
in behave - parse;  re; cfparse. and you would have to recreate these matching algorithms exactly.) 
- Parallel test runs add up durations, making it look like they took longer than they actually did.
- Running debug against _multiple_ test targets at once starts a fresh debug session for each test. This can cause some minor UI side effects like 
having to click debug stop button multiple times. (If for some reason you regularly debug multiple behave test targets at once, you may wish to map 
a keyboard shortcut for debug stop.)
- Refresh button duplicated if more than one test extension is active e.g. pytest tests, (this isn't really an issue as such, you may actually prefer 
it, but MS have a potential [fix](https://github.com/microsoft/vscode/issues/139737) in the works).
- See [Troubleshooting](#troubleshooting) below.
- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues).


---
## Troubleshooting
- Does your project match the [Project Requirements](#project-requirements) section above?
- If you are getting different results running all tests vs running a test separately, it's probably down to lack of test isolation. 
- Have you tried _manually_ running the outputted behave command from the Behave VSC output window?
- Do you have the correct [Extension Settings](#extension-settings) for your project? Do you have runParallel turned on? Try turning it off. (Also if 
you have removed extension settings from your 
workspace `.vscode/settings.json`, then do you still have any of the extension settings in your 
[user settings json](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations)?)
- Try temporarily disabling other extensions.
- Check if the problem is in [Known Issues](#known-issues) / github [issues](https://github.com/jimasp/behave-vsc/issues).
- Does your project match the [Tested with](#tested-with) environment tested for this release? (Older releases are available from from the uninstall 
dropdown in visual studio code, or in 
[github](https://github.com/jimasp/behave-vsc/releases) (github contains information on which software versions they were tested with).
- The extension is only tested with a couple of example projects. It's quite possible that something specific to your project/setup/environment is 
not accounted for. See [Contributing](#contributing) below for instructions on debugging the extension with your own project. (Does the 
same issue occur with the example project workspaces, or just in your own project?) 
### Q&A
- Why am I not seeing any exceptions while debugging? Do you have the appropriate breakpoint settings in vs code, e.g. do you have 
"Raised Exceptions" etc. turned off?
- How do I clear test results? This isn't that obvious in vs code atm. You have to click the ellipsis "..." at the top of the test window and pick 
"Clear all results".

---
## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.

