# multiroot unconfigured paths project

- This project is only loaded in the multiroot workspace, because it's simpler to test it there than to create a separate launch.json, and also we want to check that
- On startup (or test explorer refresh), it should show a warning to update the behave configuration "paths" setting
- This project is here to test handling of an incorrect (as opposed to unconfigured) behave config "paths".
- The extension should show a warning that it cannot find the "steps" directory for this project.
- In multiroot, it should not stop other projects from running ok.
