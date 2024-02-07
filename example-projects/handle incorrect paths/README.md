# multiroot bad paths project

- This project is only loaded in the multiroot workspace, because it's simpler to test it there than to create a separate launch.json.
- This project is here to test handling of an incorrect (as opposed to unconfigured) behave config "paths".
- The extension should show a warning that it is ignoring invalid path in the behave config file (if there is space to display it, this will be shown in a message box, otherwise it will be shown in the log).
- Also, it should not stop other multiroot projects from running ok.
