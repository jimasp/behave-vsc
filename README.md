# Behave VSC 

## Pre-release v0.0.2
- A simple test runner (and debugger) for running python Behave tests in vscode
- Built with the new Visual Studio Code Test API  
- See [Known Issues](#known-issues) and [Troubleshooting](#troubleshooting) below if you have any problems

## Tested with
- behave 1.2.6
- Python 3.9.7
- Linux/Windows

---
## Project Requirements
- A single vscode workspace folder
- No conflicting behave extension is installed
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/) 
- A (lowercase) "features" folder somewhere in the project
- A behave-conformant directory structure, e.g. you could have a root `features` folder that contains a `steps` folder:
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
## Features

- Run or Debug behave tests from the test workbench, or from inside a Feature file.
- Go to step definition from feature file. (Not shown in below gif, just right-click inside feature file on a line containing a step and click "Go to step").
- Run customisation via [Extension settings](#extension-settings).
- In run mode, std/err output can be found in the Behave VSC output window, including an equivalent behave command to run the test manually. (In debug mode, errors are shown in the console.)


![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)

---
## Extension Settings

- `behave-vsc.runParallel`
  - Default: false
  - Enables/disables running tests in parallel. (Experimental). 
  - It is advised to leave this disabled for your initial test 
run, then change it to enabled if your project test suite supports running multiple tests at the same time, i.e. unless your tests are fully 
**isolated**, then you should not enable this setting. Note that behave itself does not support parallel testing - enabling this setting will create 
multiple behave instances, so in the case of running all tests, it may be no faster due to the overhead of starting multiple processes. 
It will be faster if you select a subset/group of tests to run.  
  - This setting has NO effect when you are running all tests and runAllAsOne is enabled. 
  
- `behave-vsc.runAllAsOne` 
   - Default: true
  - Enables/disables running all tests together, i.e. one-shot `python -m behave` when you run all tests. 
  - Keep this enabled unless you prefer to use runParallel when running all tests so you can see the test results as they come in. 
  - Note that running behave as one-shot can cause different test results under some circumstances versus running them individually, e.g. if you 
  set `context.failed` in your tests.)   

- `behave-vsc.fastSkipList`
  - Default: empty string
  - A csv of skip strings that start with `@`, e.g. `@skip, @skipped` that will stop behave being called for features/scenarios marked with those tags. 
  - This is just so you can speed up your test run if you have a large amount of skipped tests. 
  - This setting has no effect when you are running all tests and runAllAsOne is enabled.

---
## Known Issues
- Refresh button duplicated (MS have a [fix](https://github.com/microsoft/vscode/issues/139737) in the works).
- Does not support multiple workspace folders. (No plans to support this.)
- Parallel tests add up durations, making it look like parallel test runs take longer than they actually do.
- Check if the issue has been reported in github [issues](https://github.com/jimasp/behave-vsc/issues)?


---
## Troubleshooting
- Does your setup match the [Requirements](#requirements) section above?
- Check if the problem is in [Known Issues](#known-issues) above.
- Have you tried manually running the outputted behave command from the Behave VSC output window?
- Do you have runParallel turned on? Try turning it off.
- Do you have the latest version of the extension?
- Do you have the correct [Extension Settings](#extension-settings) for your project? (Also if you have removed extension settings from your 
workspace `.vscode/settings.json`, then do you have any of the extension settings in your user settings?)
- Try disabling other extensions.
- Have you got the latest version of the extension?
- Does your project environment match the environment tested for this release? Older releases are available in 
[github](https://github.com/jimasp/behave-vsc/releases).
- See [Contributing](#contributing) below for extension debugging instructions. (Does the issue occur with the example project workspaces, or just 
in your own project?) 

---  
## How it works

### How test runs work:

- The extension builds up a separate command for each test and runs it. For example:
  ```
  python -m behave -i "features/myfeaturegroup/myfeature.feature" -n "my scenario"
  ```

- Standard and Error output is shown in the behave-vsc output window, including an equivalent behave command to run the test manually.


### How debug works:

- It builds up a debug launch config and runs that.    
This enables `ms-python.python` to do the heavy lifting of setting up the debug port etc.

- Error output (only) is shown in the debug console window.


---
## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.

