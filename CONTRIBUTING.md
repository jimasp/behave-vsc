# CONTRIBUTING

## Developing/Debugging this extension

---
### General
- Before starting any development, please fully read through the [README](README.md) as well as this document. It may solve/answer your issue.
- If you are going to be developing/debugging this extension, uninstall the packaged extension from vscode. (Generally, you can develop the extension 
without doing this, but it is not recommended as there could be side-effects.)
- If you want to contribute to the extension, read through everything below, then fork the repo, make your changes, and submit a pull request.
- If you do wish to contribute, please make sure to read "Design principles" and "Before pushing a PR"
- This code is under the MIT licence. You are free to fork it and do your own thing as long as the LICENSE.txt is included, but please do 
contribute bug fix PRs to the [original repo](https://github.com/jimasp/behave-vsc).
- Fixes > Features.

---
### Development environment setup for extension development:
1. Notes:
	- Perform ALL these steps ***OUTSIDE*** of visual studio code
	- It is assumed that you have already installed python 3.9.x and the `ms-python.python` extension
2. Uninstall the packaged extension (optional, but recommended):
	- `code --uninstall-extension jimasp.behave-vsc` 
3. Install node (via nvm) if you need to. See official nvm [doc](https://github.com/nvm-sh/nvm#install--update-script), but example commands are:
	- Linux: 
		- `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash` (latest versio command can be found [here](https://github.com/nvm-sh/nvm#install--update-script))
		- `source ~/.bashrc && source ~/.bash_profile && source ~/.profile`
		- `nvm install --lts`
		- `nvm use --lts`		
	- Windows: 
		- Use the installer from https://github.com/coreybutler/nvm-windows/releases
		- Open a fresh _new_ admin cmd prompt
		- `nvm install latest`
		- `nvm use latest`
4. Install required node packages
	- `cd <extension_project_folder>`
	- `npm install`
5. Install required python packages:  
 	- `pip install -r requirements.txt`
6. Install required extensions for developing the extension:  
	- `code --install-extension ms-python.python`
	- `code --install-extension dbaeumer.vscode-eslint`
	- `code --install-extension amodio.tsl-problem-matcher`
7. Check it all works before opening visual studio code:  
	- `npm run test`

---
### Running/Debugging the extension
1. Set up your environment as above.
2. Open vscode
3. (`Ctrl+Shift+B`) to build and kick off a watch.
4. (Optional) set breakpoints in your code, e.g. start with `src/extension.ts activate` function.
5. (`Ctrl+Shift+D`) + click the "Run Extension" target (if "Run Extension" is the current selection, you can just hit (`F5`) from anywhere).
6. To debug using a different host project, open `.vscode/launch.json` in the extension projet and change the `args` setting `"${workspaceFolder}/example-project-workspace-1"` repoint it at your project path. 
7. Note - if you have "uncaught exceptions" enabled in the extension project, and you are running/debugging a behave test in the host vscode environment, you may 
need to hit play in the extension vscode environment to continue.

---
## General notes
- You can relaunch the extension from the debug toolbar in the extension vscode environment after changing extension code.
- Alternatively, you can reload (`Ctrl+R`) the vscode host environment to load your changes.

---
## Running extension integration tests
Either:
1. (`Ctrl+Shift+D`) + click the "Extension Tests" target (if "Extension Tests" is the current selection, you can just hit (`F5`) 
from anywhere), or
2. Close vscode and excecute `npm run test` from a command line.

---
## Debugging integration tests
- Open the debug viewlet (`Ctrl+Shift+D`) and from the launch configuration dropdown pick `Extension Tests`.
- Press `F5` to run the tests in a new window with your extension loaded.
- Optionally add a breakpoint in e.g. `activate`
- See the output of the test result in the debug console.
- Make changes to `src/test`.
  - The provided test runner will only consider files matching the name pattern `**.test.ts`.
  - You can create folders inside the `test` folder to structure your tests.

---
## Generating the extension installer manually (.vsix file)
1. `npm install -g vsce` (installs latest version)
2. `vsce package -o ../mypackagefolder`

---
## Troubleshooting
- See troubleshooting section in the main [README](README.md#troubleshooting) for non-development issues.  
- Do you have the latest version of the source code?
- If you get an error debugging "Run Extension", set a breakpoint at the beginning of the `extension.ts` activate function.
- If you get an error debugging "Extension Tests", set a breakpoint at the beggining of the `extension.test.ts` suite function.
- If you don't hit either function breakpoint, try putting a breakpoint at the very first line of every `.ts` file and see if it jumps out 
of debugging, e.g. if there is a webpack/import issue.
- If `npm run test` fails on the command line, it could be a timeout, removing all breakpoints from both enviroments.
- If the "Extension Tests" debug test fails, it could be a timeout, removing all breakpoints from both enviroments.
Specific problem:
- Is the problem actually in another extension - which code are you in? Try disabling other extensions.
- Does the issue occur with the example project workspaces, or just in your own project? What is different about your proect? You can add your 
own project to the extension .vscode/launch.json to debug the extension against it.
- Have you made any changes yourself? If so, can you e.g. stash/backup your changes and do a `git clean -fxd` and pull latest?

---
## Before requesting a PR merge
- Raise an issue describing the problem that the PR is resolves and link it in the issue
- Quickly review your code vs the project's [Design principles](#design-principles)
- Is your bug/use case covered by an existing test? If not, is it possible to add one so it doesn't break again?
- `npm run lint` and fix any errors (errors must be fixed, warnings should be fixed unless they would result in changes to `extension.ts`.)
- Automated tests (verify behave results):
	- Close vscode and run `npm run test` (currently these only verify test results, they do not test any UI interactions)
- Depending on what you changed, you might need to run some Manual tests, e.g.:
	1. run example-project-workspace-1
	2. edit a group1 feature file, change the name of the feature and save it, then: 
		- check the test UI tree shows the rename
		- check you can run the renamed feature from inside the feature file
	3. edit a group2 outline feature file, change the name of a scenario and save it, then: 
		- check the test UI tree shows the rename
		- check you can run the changed scenario from inside the feature file
		- check you can debug the renamed scenario from inside the feature file
	4. open a diff comparison on the feature file you changed
	5. close vscode, open it again, check that having a feature file open on start up, you can run a scenario from inside the feature file 
	(the normal feature file that is open, not the diff view)

---
## Design principles
- Try not to add any npm packages - lightweight, less security/licensing concerns.
- No reliance on other extensions except `ms-python.python`.
- Only small changes to `extension.ts` after release 1.0.0. (Reason - the code was originally based on an [MS sample repo](https://github.com/microsoft/vscode-extension-samples/blob/main/test-provider-sample) - so, if vscode event hooks change, or features get added we might just be able to grab the fix/feature via future commits to that file in the MS repo.)
- Cross-platform, i.e. OS-independent drive/path separators, line-endings, encoding, etc.
- KISS:
	- Easiest method for run/debug possible (i.e. leverage launch.json do not create/attach a debug server yourself, and let MS python extension/behave do the work where possible).
	- "It just works" - avoid anything that might break on someone else's box, for example don't rely on bash or file paths (Windows v Linux).
	- YAGNI - simple, minimal code to get the job done, and don't add features people don't need that could break stuff.

