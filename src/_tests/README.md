# Integration Tests

In each project suite you will find:

- `multi.test.ts`:
  - called by `multi-root suite/index.ts` (which itself is called by `npmRunTest.ts`).
  - contains tests we want to run in the multiroot suite, i.e. these are tests we will run in parallel with other projects in the multiroot workspace.

- `runProjectTests.ts`:
  - called by `npmRunTest.ts` (npmRunTest also calls `multiroot/index.ts` to run `multi.test.ts`).
  - returns Runners for `project.tests.ts`, which are more extensive tests we don't run in the multiroot suite, only when the project is run on its own. (While these tests would work in multiroot, it's better if they fail in isolation so its easier to track down when `npm run test` fails, and keeping them separate also means that test runs are faster.)
  
- `runAllTests.ts`:
  - called by `launch.json` (i.e. when running tests inside vscode).
  - returns Runners for all the `*.tests.ts` files in a folder, i.e. including both `multi.test.ts` and `project.tests.ts`.
