### Example projects used by extension integration tests

- simple - a very simple project
- project A - project with a non-standard features path and various feature test/step setups
- project B - project with nested features, step refs, regexs, and other concerns not covered by project A
- bad import - project containing a step file with a intentional bad import to test error handling/output
- projects included in the multiroot.code-workspace:
  - multiroot bad features path - project to test error handling/output for a bad feature path in settings.json
  - multiroot empty folder - project to test error handling/output for an empty project folder
  - multiroot ignored - project that should be ignored (see readme inside the project folder)
  - project A
  - project B
