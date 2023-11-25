# Behave VSC

Debug and run Python [behave](https://behave.readthedocs.io/) BDD tests using the native Visual Studio Code Test API.  
Includes two-way step navigation, Gherkin syntax highlighting, autoformatting, autocompletion, and a few basic snippets.

![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)

## Features

- Run or Debug behave tests, either from the test explorer or from inside a feature file.
  - Select to run/debug all tests, a nested folder, or just a single feature or scenario.
  - Select to run tests with tags and/or environment variables via run profiles (inc. ad-hoc).
  - See failed test run result inside the feature file. (Full behave output is available in the Behave VSC output window.)
- Two-way step navigation:
  - "Go to Step Definition" from inside a feature file (default F12).
  - "Find All Step References" from inside a step file (default Alt+F12).
  - Quick-navigate in the Step References Window (default F4 + Shift F4).
  - Includes step library support.
- Automatic Gherkin syntax highlighting (colourisation), including smart parameter highlighting.  
- Smart feature step auto-completion, e.g. typing `And` after a `Given` step will only show `@given` or `@step` step suggestions. (Also some snippets are thrown in.)
- Feature file formatting (default Ctrl+K,Ctrl+F), including optional autoformat on save.
- Smart test runs minimise behave instances by building an optimised `-i` regex param for behave based on the selected test nodes. (Unless `runParallel` is enabled.)
- This extension supports multi-root workspaces, so you can run features from more than one project in a single instance of vscode. (Each project folder must have its own distinct features/steps folders.)
- Extensive customisation settings (e.g. `runParallel`, `envVarOverrides`, run profiles for per-run settings, etc.)

---

## Terminology

- "Project" is shorthand for "a root workspace folder that contains feature files". A multi-root workspace can contain multiple projects. Each project has its own `.vscode/settings.json` file.

## Workspace requirements

- No conflicting behave/gherkin/cucumber extension is enabled
- Extension activation requires at least one `*.feature` file somewhere in the workspace
- A compatible project directory structure
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/)

### Compatible project directory structures

- A [behave-conformant](https://behave.readthedocs.io/en/stable/gherkin.html) directory structure:
  - At least one `features` folder (lowercase by default). You don't have to call it "features" (read on), but behave requires that you have a folder called `steps` (lowercase).
  - If you have an `environment.py` file, then it must be at the same level as the `steps` folder.  
  - The `features` and `steps` folders must be somewhere *inside* the project folder for the extension to find them.
  - If you add subfolders inside the `steps` folder, then the extension will find those steps, but behave will only find them if you use `import` statements.
  - (In the below examples the behave configuration file is `behave.ini`, but you can also use `.behaverc`, `setup.cfg`, or `tox.ini`.)
  
  - Example 1 - steps folder is a child of the features folder:

    ```text
    my-project/
    ├── behave.ini
    └── features/
        ├── environment.py    
        ├── db_features
        │   └── db1.feature   
        ├── web_features
        │   └── web1.feature   
        └── steps/
            ├── shared.py
            ├── db.py                             
            └── web.py
    ```

  - Example 2 - steps folder is a sibling of the features folder:

    ```text
    my-project/
    ├── behave.ini
    ├── environment.py       
    ├── features/
    │   ├── db_features
    │   │   └── db1.feature   
    │   └── web_features
    │       └── web1.feature       
    └── steps/
        ├── shared.py
        ├── db.py                             
        └── web.py
    ```

  - Example 3 - multiple top-level features folders:

    ```text
    ├── behave.ini
    ├── environment.py
    ├── db_features
    │   └── db1.feature
    ├── web_features
    │   └── web1.feature
    └── steps/
        ├── shared.py
        ├── db.py                             
        └── web.py
    ```

- If your features folder is not called "features", or is not in your project root, then you can add a behave config file (e.g. `behave.ini`) to your project folder to specify the features paths:

  - For Example 3 above:

    ```ini
    # behave.ini
    [behave]
    paths=db_features
          web_features
    ```

- If you have any issues with relative imports due to the behave working directory then you can set a `PYTHONPATH` environment variable for behave execution. Note that these do not expand, (i.e. you cannot use `${PYTHONPATH}` on Linux or `%PYTHONPATH%` on Windows), so you will need to include all required paths in your `envVarOverrides` setting, e.g. `"PYTHONPATH": "src/lib1:src/lib2:myfolder"`".

  - Example:

    ```json
    // settings.json
    {
      "behave-vsc.envVarOverrides": {
          "PYTHONPATH": "myfolder"
      },
    }
    ```

- Step navigation is automatically enabled for your steps folder, but you can also enable step navigation for imported step libraries that are inside your project folder via the `stepLibraries` setting. (Note that any path here that is also included in a `files.watcherExclude` setting will not be updated dynamically, i.e. on file/folder changes.)

  - Example:

    ```json
    // settings.json
    {
      "behave-vsc.stepLibraries": [
          {
              "relativePath": ".venv/lib/python3.9/site-packages/package-steps-lib",
              "stepFilesRx": ".*/steps.py|.*/steps/.*"
          },
          {
              "relativePath": "my_steps_lib",
              "stepFilesRx": ".*/steps/.*",
          }
      ],
      "behave-vsc.justMyCode": false
    }
    ```

---

## Extension settings

- This extension has various options to customise your test run via `settings.json`, e.g. `runParallel`, and `envVarOverrides`.
- You can also disable/enable `justMyCode` for debug (via `settings.json` not `launch.json`).
- Note that environment variables (and behave tags) can also be set on a per run basis via the test run profiles in the test explorer UI.
- If you are using a multi-root workspace with multiple projects that contain feature files, you can set up default settings in your `*.code-workspace` file, then optionally override these as required in the `settings.json` in each workspace folder.
- For more information on available options, go to the extension settings in vscode.

---

## How the extension works

### How test runs work

- The python path is obtained from the `ms-python.python` extension (exported settings) i.e. your `python.defaultInterpreterPath` or selected python interpreter override. This is read before each run, so it is kept in sync with your project. The behave command working directory is your root project directory.

- For each run, the behave command to run the test manually appears in the `Behave VSC` output window.

- The behave process is spawned, and behave output is written to the `Behave VSC` output window for the associated workspace.

- The extension parses the junit file output and updates the test result in the UI. Any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.

- You can adjust the run behaviour via extension settings in your `settings.json` file, e.g. `runParallel`, `envVarOverrides`, `runProfiles`.

- Tests runs are smart, so for example if you select to run three feature nodes it will build a behave `-i` regex to run them in a single behave instance rather than separate instances (unless you are using `runParallel`). If you choose a nested folder it will run that folder in a behave instance, etc.

- Run profiles can be used for per-run settings (see [Running a subset of tests](#running-a-subset-of-tests)).

### How debug works

- It dynamically builds a debug launch config with the behave command and runs that. (This is a programmatic equivalent to creating your own debug launch.json and enables the `ms-python.python` extension to do the work of debugging.)

- You can control whether debug steps into external code via the extension setting `justMyCode` (i.e. in your `settings.json` *not* your `launch.json`).

- Behave stderr output (only) is shown in the debug console window. (This is to reduce noise when debugging. Run the test instead if you want to see the full behave output.)

- You can adjust the debug behaviour via extension settings in your `settings.json` file, e.g. `envVarOverrides` or `runProfiles`. Note that debug ignores the `runParallel` setting.

- The extension parses the junit file output and updates the test result in the UI. Any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.

---

## Running a subset of tests

- There are several options here. Using a combination of all of these is recommended:

  - A. Consider if you can group your feature files into subfolders, i.e. don't just use tags. This way you can select to run any folder/subfolder from the test tree in the test explorer UI.

  - B. Consider if you can use a naming scheme for feature subfolders/files that will allow you to leverage the filtering at the top of the test explorer to run just those tests by name.

  - C. Via the `Run Tests with Tags` run profile in the test explorer (or via the `>` icon and `Execute using profile` in the feature file itself). Note that this can be further filtered by your selection in the test tree.

  - D. Via custom (reusable) run profiles. Use the `runProfiles` setting to set up run profiles in the test explorer. Combining test tree selection with run profiles makes a very flexible combination, e.g. you can select to run a single folder of feature tests with a given tag. An example `runProfiles` section might look like this:

      ```json
      // settings.json
      "behave-vsc.runProfiles": {
          "tagA profile": {
              "tagExpression": "@a",            
              "envVarOverrides": {
                "myvar": "val1"
              },
          },
          "tagsBorC profile": {
              "tagExpression": "@b,@c",            
              "envVarOverrides": {
                "myvar": "val2",                
                "BEHAVE_STAGE": "production"
              },
          }
      }
      ```

  - Notes on environment variables:
    - The `envVarOverrides` property in a runProfile will (while running) override any `behave-vsc.envVarOverrides` setting that has the same key.
    - You can use an environment variable for a high level of customisation:
      - in your `environment.py` (or `mystage_environment.py`) file:
        - to control a behave [active_tag_value_provider](https://behave.readthedocs.io/en/stable/new_and_noteworthy_v1.2.5.html#active-tags)
        - to control `scenario.skip()`
        - which `before_all` will use to load a specific config file e.g. `configparser.read(os.environ["MY_CONFIG_PATH"])` to allow fine-grained control of the test run
        - which `before_all` will use to load a specific subset of environment variables, e.g. `load_dotenv(os.environ["MY_DOTENV_PATH"])`
      - to set the [BEHAVE_STAGE](https://behave.readthedocs.io/en/stable/new_and_noteworthy_v1.2.5.html#test-stages) environment variable.

## Q&A

- *How can I see all effective settings for the extension?*
  - On starting vscode, look in the Behave VSC output window.

- *How can I see the active behave configuration being used for behave execution?*
  - In your behave config file, set `verbose=true`.

- *How do I clear previous test results?*
  - This isn't that obvious in vscode. Click the ellipsis `...` at the top of the test explorer and then click `Clear all results`.

- *Why does the behave command output contain `--show-skipped`?*
  - This flag must be enabled for junit files to be produced for skipped tests (which the extension depends on). It is enabled by default, so this override is there *just in case* your `behave.ini`/`.behaverc` file specifies `show_skipped=False`.

- *How do I enable automatic feature file formatting on save?*
  - using a standard vscode setting:

    ```json
    "[gherkin]": { "editor.formatOnSave": true }
    ```

- *How do I disable feature file snippets?*
  - using a standard vscode setting:

    ```json
    "[gherkin]": { "editor.suggest.showSnippets": false }
    ```

- *How do I disable extension autocomplete for feature files?*
  - using a standard vscode setting:

    ```json
    "[gherkin]": { "editor.suggest.showFunctions": false }
    ```

- *How do I disable Copilot autocomplete for feature files?*
  - using a standard vscode setting:

    ```json
      "github.copilot.enable": {
          "*": true,
          "gherkin": false,
      },
    ```

- *Why can't I see print statements in the Behave VSC output window even though I have `stdout_capture=False` in my behave config file?*

  - Because the extension depends on the `--junit` behave argument. As per the behave docs, with this flag set, all stdout and stderr will be redirected and dumped to the junit report, regardless of the capture/no-capture options. If you want to see print statements, copy/paste the outputted command and run it manually (or run `python -m behave` for all test output).

- *Where is the behave junit output stored?*

  - In a temp folder that is deleted (recycled) each time the extension is started. The path is displayed on startup in the Behave VSC output window. (Note that if your test run uses runParallel, then multiple files are created for the same feature using a separate folder for each scenario. This is a workaround to stop the same junit file being written multiple times for the same feature, which in runParallel mode would stop us from being able to know the result of the test because each parallel behave execution would rewrite the same file and mark scenarios not included in that execution as "skipped".)
  
- *When will this extension have a release version?*

  - When the code is more stable. At the moment the code is subject to big rewrites/refactoring which makes breaking changes (and bugs) more likely.

---

## Troubleshooting

### If you have used a previous version of this extension (or a previous version of vscode), and a new version has created a problem

- Please read through the [release notes](https://github.com/jimasp/behave-vsc/releases) for breaking changes. If that does not resolve your issue, then please rollback to the previous working version via the vscode uninstall dropdown and raise an [issue](https://github.com/jimasp/behave-vsc/issues). (Please note that choosing a specific version will stop the extension from upgrading in future, so you will need to manually upgrade to a newer version when the issue has been fixed.)
  
### Otherwise

- Does your project meet the [workspace requirements](#workspace-requirements) and have a [compatible project directory structure](#compatible-project-directory-structures)?

- Make sure the `paths` setting in your behave configuration file is correct.

- Have you tried *manually* running the behave command that is logged in the Behave VSC output window?

- Does refreshing the Test explorer solve your issue?

- Does restarting vscode solve your issue?

- Did you set extension settings in your vscode user settings instead of your workspace settings? Is there something incorrect in your vscode user settings?

- Do you have the latest version of the extension installed? The problem may have been fixed in a newer release. (Please note that the latest version you can install is determined by your vscode version, so you may need to update vscode first.)

- Have you recently upgraded vscode, and does your python/behave environment match the one tested for this release? You can check the environment tested for each release on [github](https://github.com/jimasp/behave-vsc/releases) and downgrade as required.

- If you are getting different results running all tests vs running a test separately, then it is probably due to lack of test isolation.

- If you are not seeing exceptions while debugging a test, do you have the appropriate breakpoint settings in vscode, e.g. do you have "Raised Exceptions" etc. turned off?

- Do you have the correct extension [settings](#extension-settings) for your project? (See [Q&A](#qa) for information on how to see your effective settings.)

- Do you have the `runParallel` setting turned on? Try turning it off.

- Check if the problem is in [Known Issues](#known-issues-and-limitations) below

- Check if the issue has already been reported in github [issues](https://github.com/jimasp/behave-vsc/issues?q=is%3Aissue).

- Try temporarily disabling other extensions. Especially if they relate to behave, gherkin or cucumber.

- Any extension errors should pop up in a notification window, but you can also look at debug logs and error stacks by enabling `xRay` in the extension settings and using vscode command "Developer: Toggle Developer Tools".

- The extension is only tested with a few [example projects](https://github.com/jimasp/behave-vsc/tree/main/example-projects). It's possible that something specific to your project/setup/environment is not accounted for. See [Contributing](CONTRIBUTING.md) for instructions on debugging the extension with your own project. (If you debug with your own project, you may also wish to check whether the same issue occurs with one of the example project workspaces that has a similar structure to your own.)

---

## Known issues and limitations

- Step navigation limitations ("Go to Step Definition" and "Find All Step References"):

  - Step matching does not always match as per behave. It uses a simple regex match via replacing `{foo}` -> `{.*}`. As such, it does *not* consider `re` regex matching like `(?P<foo>foo)`, typed parameters like `{foo:d}`, or `cfparse` cardinal parameters like `{foo:?}`.

  - Step navigation only finds features and steps that are inside your project folder. If you import steps in python from outside your project folder it won't find them. (You can however install external steps as a package and use the `stepLibraries` setting.)

- There is currently a bug in the MS python extension if you are using `unittest` for your python tests in a multiroot project and you hit the `>>` (Run Tests) button (or equivalent command) to execute all tests. This may cause your test run not to stop or not to update test results correctly. Workarounds are:

  - a. Use `pytest` instead of `unittest` to run your tests (which supports running `unittest` tests out of the box), or
  
  - b. Do not use the `>>` button, i.e. run tests from a test tree node instead (e.g. `Python Tests` or `Feature Tests` separately).

- There is currently a [bug](https://github.com/microsoft/vscode-extension-samples/issues/728) in vscode itself where a test will no longer play from within the editor window when you add spaces or autoformat a feature file. A workaround is to close the feature file and reopen it.

- Individual test durations are taken from behave junit xml files, not actual execution time.

---

## Contributing

If you would like to submit a pull request, please see the  [contributing](CONTRIBUTING.md) doc.
