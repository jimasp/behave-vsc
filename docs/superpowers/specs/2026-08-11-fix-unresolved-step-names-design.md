# Fix unresolved step names (Go to Step Definition / Find All Step References)

## Problem

`behave-vsc`'s two-way step navigation (`gotoStepHandler.ts`, `findStepReferencesHandler.ts`) depends on `stepMappings.ts` matching each feature-file step to a Python step-definition function. The matcher is a simplified regex approximation of behave's real matching (parse/cfparse/re), documented as such in the README's Known Issues. Against a small, real-world test-suite repo (`vertice-test-suites-python`, 262 feature files, `use_step_matcher("cfparse")`, a `behave-vsc.extraStepPaths` entry pointing at a vendored `.venv` package), some feature steps are expected to fail to resolve — either because of genuine gaps in the matcher, or because of real issues in that repo's feature/step files (typos, orphaned steps).

Scope note: `vertice-test-suites-python`'s `manual/` folder is out of scope — it is excluded by request, and in any case sits outside `behave.ini`'s `paths=features/`, so `behave-vsc` never scans it.

## Goal

Find every feature-file step in `vertice-test-suites-python/features` that `behave-vsc` cannot resolve to a step definition, determine why for each one, and:
- fix genuine `behave-vsc` matcher bugs (with regression tests), and
- propose fixes for genuine issues in `vertice-test-suites-python` itself (for separate review — that repo is not modified unilaterally).

Success is not "fewer unresolved steps" but every remaining unresolved step being explained and tagged with a reason.

## Approach

### 1. Audit script (throwaway, not committed)

A standalone Node script kept outside the repo (scratchpad) that:

1. Runs `npm run compile-tests` in `behave-vsc` so `out/` has current compiled JS for every module under `src/` (this is what the existing integration test suites already rely on — they import parser internals straight from `out/`, bypassing the webpack bundle).
2. Calls `@vscode/test-electron`'s `runTests()` — the same mechanism `npm run test` uses — with:
   - `extensionDevelopmentPath` = the `behave-vsc` repo root (loads the current branch's code)
   - `launchArgs` = `[<path to vertice-test-suites-python>]`
   - `extensionTestsPath` = a small custom entry point (plain `run(callback)`, no Mocha needed) that executes inside the real extension host process
3. That entry point, running with the real `vscode` API available:
   - Waits for extension activation and for `parser.stepsParseComplete()`
   - Imports `getFeatureFileSteps` and `getStepMappings` directly from the compiled `out/parsers/featureParser` and `out/parsers/stepMappings`
   - For the workspace's `featuresUri`, computes: all feature-file steps minus the ones present in `stepMappings` = the unresolved set
   - Writes a JSON report to the scratchpad: `{ file, line, stepType, text }[]` plus a summary count

This reuses the plugin's actual matching code (no separate reimplementation to drift out of sync) and requires no changes to `behave-vsc`'s source tree to produce the first report.

### 2. Fix workflow

1. Run the audit script to get the full unresolved list.
2. Cluster by root cause rather than fixing one-by-one blind — for each unresolved step, inspect the parsed step-definition candidates to see why `stepMappings.ts`/`stepsParser.ts`'s regex-based matching missed it (e.g. decorator form not recognized, param syntax not translated, escaping issue, step-type mismatch). Likely candidate categories based on this repo's known usage: `cfparse` custom types (`{user_type:UserRole}`), multi-decorator/multi-line decorators, `extraStepPaths`-sourced steps.
3. For each category, confirm it's a genuine `behave-vsc` bug (not a real orphaned/typo'd step) by checking whether `behave` itself would actually match that step at runtime — consistent with the project's existing guideline that the extension must never diverge from real `behave` behaviour.
4. Fix the category in `behave-vsc` source; add a minimal synthetic repro fixture + integration test (see below); run `npm run test` to confirm no regressions.
5. Re-run the audit script to confirm that category's steps now resolve and to catch anything new the fix introduced.
6. Repeat 2–5 until all remaining unresolved steps are genuine `vertice-test-suites-python` issues, not plugin bugs.
7. For genuine test-suite-repo issues, write up the specific fix (corrected feature wording, or corrected step decorator) as a proposal for review — not applied unilaterally, since it's a separate repo.

### 3. Regression tests in behave-vsc

For each confirmed matcher bug:
- Add a minimal synthetic feature+step reproduction, either into an existing `example-projects/*` folder if it fits that project's theme, or a new folder following the existing naming convention (e.g. alongside `simple`, `sibling steps folder 1/2/3`).
- Add a corresponding suite under `src/_integrationTests/<name> suite/` (`index.ts`, `extension.test.ts`, `expectedResults.ts`), reusing `SharedWorkspaceTests` (`suite-shared/shared.workspace.tests.ts`) where it fits, asserting the step now resolves.
- Register the new suite in `runTestSuites.ts` and add matching `Run Test Suite: ...` / `Debug: ... workspace` entries to `.vscode/launch.json`, so it runs under `npm run test` and is debuggable like every other suite.

## Deliverables

- Final audit report (JSON): total steps checked, how many resolve, and the remaining unresolved list each tagged `fixed-in-plugin` / `genuine-test-suite-issue` / `unknown`.
- A set of `behave-vsc` commits on the current `fix/step_names` branch, each pairing one root-cause fix with its regression fixture/test.
- A short written summary of any `vertice-test-suites-python`-side issues found, with proposed fixes, for review before that repo is touched.

## Out of scope

- Modifying `vertice-test-suites-python` unilaterally.
- `manual/` folder in `vertice-test-suites-python`.
- Turning the audit script into a permanent/supported `behave-vsc` feature (kept as a throwaway diagnostic for this investigation).
- Adding support for behave's `re`/typed-parameter matching semantics beyond what's needed to fix confirmed bugs — the matcher remains a documented approximation, not a full behave-compatible parser.
