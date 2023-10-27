# Example projects used by extension integration tests

- simple - a very simple project
- project A - project with a non-standard features path and various feature test/step setups
- project B - project with multiple step folders, nested features, step refs, regexs, and other concerns not covered by project A. also settings.json is set to runParallel [^1].
- bad import - project containing a step file with a intentional bad import to test error handling/output
- sibling steps folder - project containing a steps folder at the same level as the features folder
- sibling steps folder 2 - project containing a features and steps folder in the same subfolder
- higher steps folder - project containing a steps folder at a higher level than the features subfolder
- projects included in the multiroot.code-workspace:
  - multiroot bad features path - project to test error handling/output for a bad feature path in settings.json
  - multiroot empty folder - project to test error handling/output for an empty project folder
  - multiroot ignored - project that should be ignored (see readme inside the project folder)
  - project A - (explained above)
  - project B - (explained above)

[^1]: when running integration test suites, various test configurations are passed to each project
