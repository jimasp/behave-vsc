---
name: Bug report
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

NOTE: before posting an issue, please make sure you read through the Troubleshooting section of the readme: <https://github.com/jimasp/behave-vsc-tid/blob/main/README.md#troubleshooting>

Please note that I can only support issues with the latest release (<https://github.com/jimasp/behave-vsc-tid/releases>) and the latest version of vscode. The supported behave version is 1.2.6.

**Describe the bug (required):**
A clear and concise description of what the bug is.
Include the expected behaviour.
What happened instead? Did you get an error, if so, what did it say?

**To Reproduce (required):**
If I can't recreate the problem, I can't fix it.
Please detail the steps that are required to recreate your issue.
(Optional) can you supply a link to a public repo that recreates the problem?

**Operating system (required):**
Please note that only Windows and Linux are directly supported, i.e. if your issue is Mac-specific, you'll need to raise a PR.

**Directory structure (optional, but often relevant):**
What does your workspace look like? Where are your features/steps folders? Can you supply an image?
Is it a multi-root workspace (i.e. you have a `foobar.code-workspace` file) or just a simple workspace?

**Screenshots and GIFS (optional):**
If applicable, add any other .jpg/.png screenshots or animated gifs to your post (using markdown) to help explain your problem.
If recording an animated gif of vscode, please enable "Developer: Toggle Screencast mode" in vscode to show your keyboard/mouse interactions.
(One easy way to record vscode gifs is to use [chronicler](https://marketplace.visualstudio.com/items?itemName=arcsine.chronicler) with the gif setting enabled: `"chronicler.recording-defaults": { "animatedGif": true }`.)

**Debug result (optional):**
Did you enable the "behave-vsc-tid.xRay" setting? Did it give you any more information about the problem?
Have you tried debugging the extension itself with your own workspace (via the instructions in <https://github.com/jimasp/behave-vsc-tid/blob/main/CONTRIBUTING.md>)?
If so, what was the result?

**Pull request with proposed fix (optional):**
If you have created a pull request in a fork to fix the issue, please link it here.
