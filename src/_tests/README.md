# Integration Tests

- `multi.test.ts`:
  - contains tests we want to run in the multiroot suite, i.e. these are tests we will run in parallel with other projects in the multiroot workspace.
  - called by `multi-root suite/index.ts` (which is called by `npmRunTest.ts`).

- `project.test.ts`:
  - contains more extensive tests we will just run when the project is run on its own. While these tests would work in multiroot, it's better if they fail in isolation so its easier to track down when `npm run test` fails.
  - called by `npmRunTest.ts` (npmRunTest also calls `multiroot/index.ts` to run `multi.test.ts`).
  
- `runAll.ts`:
  - contains a list of all the tests in a folder, including `multi.test.ts` and `project.tests.ts`.
  - called by `launch.json` (i.e. when running tests inside vscode).
