# Behave VSC

Debug and run Python [behave](https://behave.readthedocs.io/) BDD tests using the native Visual Studio Code Test API.  
Includes two-way step navigation, Gherkin syntax highlighting, autoformatting, autocompletion, and a few basic snippets.

![Behave VSC demo gif](https://github.com/jimasp/behave-vsc/raw/main/images/behave-vsc.gif)

## Features

- Run/Debug behave tests, either from the test explorer or from inside a feature file.
  - Runs all tests, a nested folder, or just a single feature or scenario.
  - Runs tests with specific tags and/or specific environment variables via run profiles.
  - Shows failed test run result inside the feature file.
  - Shows full behave output in the Behave VSC output window.
  - Shows the behave command in the output so you can generate commands to run manually.  
  - Allows you to set behave's working directory (via `behaveWorkingDirectory` setting).  
- Two-way step navigation:
  - "Go to Step Definition" from inside a feature file (default F12).
  - "Find All Step References" from inside a step file (default Alt+F12).
  - Quick-navigate in the Step References Window (default F4 + Shift F4).
  - Includes navigation support for imported steps (e.g. step libraries) via the `importedSteps` setting.
- Automatic Gherkin syntax highlighting (colourisation), including smart parameter highlighting.  
- Smart feature step auto-completion, e.g. typing `And` after a `Given` step will only show `@given` or `@step` step suggestions. (Also some snippets are thrown in.)
- Feature file formatting (default Ctrl+K,Ctrl+F), including optional autoformat on save.
- Smart test runs minimise behave instances by building an optimised `-i` regex param for behave based on the selected test nodes. (Unless `runParallel` is enabled.)
- This extension supports multi-root workspaces, so you can run features from more than one project in a single instance of vscode. (Each project folder must have its own distinct features/steps folders.)
- Extensive customisation settings (e.g. `runParallel`, `env`, run profiles for per-run settings, etc.)

---

## Terminology used in this readme

- "workspace": the root context of the development environment in the IDE. There is only one workspace per vscode instance.
- "workspace folder" : a "root" (top-level) folder within the workspace. There can be more than one workspace folder, and each workspace folder can contain its own `.vscode` folder with it's own unique settings.
- "multi-root workspace": a workspace that contains multiple workspace folders.
- "project": within this readme, this is shorthand for "a workspace folder that contains feature files".

## Workspace/vscode requirements

- No conflicting behave/gherkin/cucumber extension is enabled
- Extension activation requires at least one `*.feature` file somewhere in the workspace
- Compatible project directory structure(s)
- [ms-python.python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension
- [behave](https://behave.readthedocs.io)
- [python](https://www.python.org/)

### Compatible project directory structures

- A [behave-conformant](https://behave.readthedocs.io/en/stable/gherkin.html) directory structure:
  - At least one `features` folder (lowercase by default). You don't have to call it "features" (read on), but behave requires that you have a folder called `steps` (lowercase).
  - If you have an `environment.py` file, then it must be at the same level (sibling) as the `steps` folder.  
  - The `features` and `steps` folders must be somewhere *inside* the project folder for the extension to find them.
  - If you add subfolders inside the `steps` folder, then the extension will find those steps, but behave will only find them if you use `import` statements.
  - (In the below example the behave configuration file is `behave.ini`, but you can also use `.behaverc`, `setup.cfg`, or `tox.ini`.)

  - Basic example (no configuration required):

    ```text
    my-project/
    ├── behave.ini
    └── features/
        ├── environment.py    
        ├── db_features/
        │   └── db1.feature   
        ├── web_features/
        │   └── web1.feature   
        └── steps/
            ├── shared_steps.py
            ├── db_steps.py                             
            └── web_steps.py

- The default working directory (and auto-discovery directory) is the project root. For very large projects, it is recommended to either:
  - a. use a `behave.ini` file in the project-root to specify the `paths` setting, or
  - b. use a subfolder for behave tests, e.g. `mytests/features`, and set the `behaveWorkingDirectory` to e.g. `mytests`.
  This will stop the extension from having to parse/watch your entire project folder looking for feature and steps files.

- In most cases, auto-discovery (along with `behaveWorkingDirectory` if required) will "just work", but otherwise see [advanced project configuration](#advanced-project-configuration) for information on how to configure the extension for your project structure.

---

## Behave settings

- If you have a very large project *and* your features folder is in your project root, then it is recommended to specify the `paths` setting in your corresponding project root behave configuration file to avoid the extension having to parse your project folder to determine the feature folder(s).

## Extension settings

For simple setups, the extension should work "out of the box", but there is plenty of customisation available via `settings.json`:

- Customise your test run via `settings.json`, e.g. `behaveWorkingDirectory`, `env`, etc.
- Enable/disable `justMyCode` for debug (via `settings.json` not `launch.json`).
- Import steps from step libraries via `importedSteps`.
- Environment variables (and behave tags) can be set on a per run basis via custom `runProfiles` which then appear in the test explorer UI.
- If you are using a multi-root workspace with multiple projects that contain feature files, you can set up default settings in your `*.code-workspace` file, then optionally override these as required in the `settings.json` in each workspace folder.
- For information on all available options, go to the extension settings in vscode.

---

## Running a subset of tests

- There are several options here. Using a combination of all of these is recommended:

  - A. Consider if you can group your feature files into subfolders, i.e. don't just use tags. This way you can select to run any folder/subfolder from the test tree in the test explorer UI.

  - B. Consider if you can use a naming scheme for feature subfolders/files that will allow you to leverage the filtering at the top of the test explorer to run just those tests by name.

  - C. Via the `Run Feature Tests with Tags (ad-hoc)` run profile in test explorer (or via the `>` icon and `Execute using profile` in the feature file itself). Note that this can be further filtered by your selection in the test tree.

  - D. Via custom (reusable) run profiles. Use the `runProfiles` setting to set up run profiles in the test explorer. Combining test tree selection with run profiles makes a very flexible combination, e.g. you can select to run a single folder of feature tests with a given tag. An example `runProfiles` section might look like this:

      ```json
      // settings.json
      "behave-vsc.env": {
          // default env vars
          "BEHAVE_STAGE": "Local",
          "ENDPOINT": "http://localhost:4566"
      },
      "behave-vsc.runProfiles": {
        "Tags: A": {
          "tagExpression": "@tagA",
        },   
        "Tags: B,C": {
          "tagExpression": "@tagB, @tagC",
        },                
        "System": {
          "env": {
            // override ONE of the default env vars
            "BEHAVE_STAGE": "System"           
          }
        },          
        "Staging: Tag B": {         
          "env": {
            // override BOTH of the default env vars
            "BEHAVE_STAGE": "Staging",
            "ENDPOINT": "http://123.456.789.012:4766"  
          },
          "tagExpression": "@tagB"
        }
      }
      ```

  - Notes:
    - vscode has the option to set a *combination* of run profiles as a default run profile via `Select Default Profile`. So you could for example select `Tags: A` and `Tags: B,C` and it would run all tests with tags A, B and C by default.
    - Regarding environment variables in runProfiles:
      - The `env` property in a runProfile will (while running) override any `behave-vsc.env` setting that has the same key.
      - You can use an environment variable for a high level of customisation:
        - in your `environment.py` (or `mystage_environment.py`) file:
          - to control a behave [active_tag_value_provider](https://behave.readthedocs.io/en/stable/new_and_noteworthy_v1.2.5.html#active-tags)
          - to control `scenario.skip()`
          - which `before_all` will use to load a specific config file e.g. `configparser.read(os.environ["MY_CONFIG_PATH"])` to allow fine-grained control of the test run
          - which `before_all` will use to load a specific subset of environment variables, e.g. `load_dotenv(os.environ["MY_DOTENV_PATH"])`
        - to set the [BEHAVE_STAGE](https://behave.readthedocs.io/en/stable/new_and_noteworthy_v1.2.5.html#test-stages) environment variable.

---

## How the extension works

### How feature/step discovery works

- It determines the features and steps folders by a combination of the following *optional* settings. If these are not supplied, then it uses defaults:
  - `behaveWorkingDirectory` extension setting,
  - `paths` in the behave configuration file,
  - `importedSteps` extension setting.

- The extension parses `*.feature` files from the determined feature folders. It then uses this information to build a test tree in the test explorer UI.

- The extension parses `*.py` files from the determined steps folders. It then uses this information to provide step navigation.

- It uses a file system watcher to keep the test tree up to date with changes to feature and step files.

### How test runs work

- The python path is obtained from the `ms-python.python` extension (exported settings) i.e. your `python.defaultInterpreterPath` or selected python interpreter override. This is read before each run, so it is kept in sync with your project. By default, the behave command working directory is your root project directory.

- For each run, the behave command to run the test manually appears in the `Behave VSC` output window. The command is optimised based on the test selection, and adds any tags or environment variables as required.

- The behave process is spawned, and behave output is written to the `Behave VSC` output window for the associated workspace.

- The extension parses the junit file output and updates the test result in the UI. Any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.

- You can adjust the run behaviour via extension settings in your `settings.json` file.

- Tests runs are smart, so for example if you select to run three feature nodes it will build a behave `-i` regex to run them in a single behave instance rather than separate instances (unless you are using `runParallel`). If you choose a nested folder it will run that folder in a behave instance, etc.

- Run profiles can be used for per-run settings (see [Running a subset of tests](#running-a-subset-of-tests)).

### How debug works

- It dynamically builds a debug launch config with the behave command and runs that. (This is a programmatic equivalent to creating your own debug `launch.json` and enables the `ms-python.python` extension to do the work of debugging.)

- You can control whether debug steps into external code via the extension setting `justMyCode` (i.e. in your `settings.json` *not* your `launch.json`).

- Behave stderr output (only) is shown in the debug console window. (This is to reduce noise when debugging. Run the test instead if you want to see the full behave output.)

- You can adjust the debug behaviour via extension settings in your `settings.json` file. Note that debug ignores the `runParallel` setting.

- The extension parses the junit file output and updates the test result in the UI. Any assertion failures and python exceptions are shown in the test run detail accessible in the feature file.

---

## Q&A

- *How can I see all effective settings for the extension?*
  - On vscode startup, look in the Behave VSC output window.

- *How can I see the active behave configuration being used for behave execution?*
  - In your behave config file, set `verbose=true`.

- *How do I clear previous test results?*
  - This isn't that obvious in vscode. Click the ellipsis `...` at the top of the test explorer and then click `Clear all results`.

- *Why does the behave command output contain `--show-skipped`?*
  - This flag must be enabled for junit files to be produced for skipped tests (which the extension depends on). It is enabled by default, so this override is there *just in case* your `behave.ini` file specifies `show_skipped=False`.

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

- Does your workspace meet the [workspace/vscode requirements](#workspacevscode-requirements) and have [compatible project directory structure(s)](#compatible-project-directory-structures)?

- If your project is not a simple setup, have you read the [advanced project configuration](#advanced-project-configuration)?

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

- If your project is so large that you file watchers do not work, then you will need to use the refresh button in the test explorer to see new/modified tests.

- Step navigation limitations ("Go to Step Definition" and "Find All Step References"):

  - Step matching does not always match as per behave. It uses a simple regex match via replacing `{foo}` -> `{.*}`. As such, it does *not* consider `re` regex matching like `(?P<foo>foo)`, typed parameters like `{foo:d}`, or `cfparse` cardinal parameters like `{foo:?}`.

  - Step navigation only finds features and steps that are inside your project folder. If you import steps in python from outside your project folder it won't find them. (You can however install external steps as a package and use the `importedSteps` setting.)

- There is currently a bug in the MS python extension if you are using `unittest` for your python tests in a multiroot project and you hit the `>>` (Run Tests) button (or equivalent command) to execute all tests. This may cause your test run not to stop or not to update test results correctly. Workarounds are:

  - a. Use `pytest` instead of `unittest` to run your tests (which supports running `unittest` tests out of the box), or
  
  - b. Do not use the `>>` button, i.e. run tests from a test tree node instead (e.g. `Python Tests` or `Feature Tests` separately).

- There is currently a [bug](https://github.com/microsoft/vscode-extension-samples/issues/728) in vscode itself where a test will no longer play from within the editor window when you add spaces or autoformat a feature file. A workaround is to close the feature file and reopen it.

- Individual test durations are taken from behave junit xml files, not actual execution time.

---

## Advanced project configuration

- Autodiscovery is based on the behave config `paths` setting and the extension `behaveWorkingDirectory` setting. If you have a non-standard project structure, then you can use these settings to configure the extension to find your features and steps.

- If your behave working directory is not the same as your project directory, then you can set the `behaveWorkingDirectory` to specify a project-relative path to the behave working directory. In terms of feature/step autodiscovery, this will then make the working directory act as the project root. Alternatively, you can set the `paths` setting in a behave config file in your project-root.

  - Example:

    ```json
      // settings.json
      {
        "behave-vsc.behaveWorkingDirectory": "my_behave_working_folder", // project-relative path
      }
    ```

- If your features folder is non-standard, i.e.:
  - it is not in your behave working directory root, or
  - it is in the behave working directory root, but is not called `features` *and* does not have a sibling `steps` folder, or
  - you have multiple features folders in the root of your behave-working-directory,

  then you can use the `paths` setting in your behave configuration file to specify a behave-working-directory-relative path to the features folder(s):

  - Example A, features folder is a subfolder of the working directory called `my_folder/my_features` and does not have a sibling `steps` folder:

      ```ini
      # behave.ini (or .behaverc, setup.cfg, tox.ini)
      [behave]
      paths=my_folder/my_features
      ```

  - Example B, multiple features folders in root of working directory:

      ```ini
      # behave.ini (or .behaverc, setup.cfg, tox.ini)
      [behave]
      paths=db_features
            web_features
      ```

- If you have any issues with relative imports then you can set a `PYTHONPATH` environment variable for behave execution using the `env` setting. Note that these do not expand, (i.e. you cannot use `${PYTHONPATH}` on Linux or `%PYTHONPATH%` on Windows), so you will need to include all required paths in your `env` setting, e.g. `"PYTHONPATH": "src/lib1:src/lib2:myfolder"`".

  - Example:

    ```json
    // settings.json
    {
      "behave-vsc.env": {
          "PYTHONPATH": "myfolder"
      },
    }
    ```

- Step navigation is automatically enabled for your steps folder, but by using `importedSteps` setting you can also enable step navigation for:
  - imported step libraries in your project folder
  - your own imported steps in your project folder
  - (note that if any path/regex is also included in a vscode `files.watcherExclude` setting, it will not have dynamic navigation updates on file/folder changes)

  - Example:

    ```json
    // settings.json
    {
      "behave-vsc.importedSteps": {
          // project-relative path : regex (not glob)
          "my_steps_lib" : ".*",
          ".venv/lib/python3.9/site-packages/package-steps-lib" : ".*/steps/.*|.*/steps.py"
      },
      "behave-vsc.justMyCode": false
    }
    ```

---

## Contributing

If you would like to submit a pull request, please see the [contributing](CONTRIBUTING.md) doc.
