# Fix Step-Matching Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 confirmed root causes (from `docs/superpowers/plans/2026-08-11-fix-unresolved-step-names.md`'s Task 4 results) behind behave-vsc's "Go to Step Definition" / step-highlighting failing to resolve real steps in a large real-world repo, each with a regression fixture and test, with zero regressions in the existing suite.

**Architecture:** One new, minimal example project (`example-projects/step matching edge cases`) reproduces all 5 bug shapes in isolated scenarios/step files, backed by one new integration test suite (`src/_integrationTests/step matching edge cases suite/`) that asserts `WkspParseCounts.stepMappings` equals `featureFileStepsExceptCommentedOut` (i.e. every real step resolves) — the same mechanism every existing suite already uses. Each bug is fixed at its exact source location (`stepsParser.ts`, `stepMappings.ts`, `featureParser.ts`), one per task, verified by re-running the suite and watching the resolved-step count move by exactly the expected amount.

**Tech Stack:** TypeScript, `@vscode/test-electron` (existing integration test mechanism), Python/`behave` (existing example-project runtime).

## Global Constraints

- Regression tests use the project's existing `WkspParseCounts` assertion mechanism (`stepMappings`, `featureFileStepsExceptCommentedOut`, `stepFileStepsExceptCommentedOut`, etc., from `src/parsers/fileParser.ts`) — do not invent a new test mechanism.
- Follow CONTRIBUTING.md: only *add* files to example projects, don't modify existing ones; no new npm dependencies; KISS; always consider cross-platform/multi-root implications are N/A here (single-root, no path-separator-sensitive code touched).
- Every fix must not change real `behave` execution results — these are all matching/navigation-layer bugs (editor-only), never touch runtime step *execution* semantics.
- `npm run test` (the full existing suite) must still pass after every source change — regressions in other suites block the task.
- `dist/` must be rebuilt (`npm run compile`) before any real extension-host run that depends on current source, and `out/` restored (`npm run compile-tests`) afterward, since `compile`'s `clean-output` step wipes both (see the corrected note in `docs/superpowers/plans/2026-08-11-fix-unresolved-step-names.md`, Task 3).
- Category 5's fix is intentionally bounded: it resolves an outline `<placeholder>` against a step definition that expects a *fixed literal word* at that position. It does not attempt full pattern-intersection for a placeholder that lands on a `{param}` position combined with additional fixed text ambiguity — that combination remains a known, accepted gap (not attempted, per the "fix it properly [for the reported case]" scope decision).

---

### Task 1: Create the `step matching edge cases` example project

**Files:**
- Create: `example-projects/step matching edge cases/.vscode/settings.json`
- Create: `example-projects/step matching edge cases/features/edge_cases.feature`
- Create: `example-projects/step matching edge cases/features/steps/multiline_comment_steps.py`
- Create: `example-projects/step matching edge cases/features/steps/mixed_quote_steps.py`
- Create: `example-projects/step matching edge cases/features/steps/trailing_colon_steps.py`
- Create: `example-projects/step matching edge cases/features/steps/outline_placeholder_steps.py`
- Create: `example-projects/step matching edge cases/features/steps/docstring_steps.py`

**Interfaces:**
- Produces: a runnable behave project (no behave-vsc/vscode involved yet) that Task 2's test suite will point at. Every step below must be independently valid Python/Gherkin that real `behave` executes successfully, regardless of any behave-vsc bug.

- [ ] **Step 1: Confirm the local Python/behave environment works (one-time, this repo's documented prerequisite)**

Run:
```bash
python3 -m behave --version || pip3 install behave==1.2.6
python3 -m behave --version
```
Expected: prints a version like `behave 1.2.6`. (Per CONTRIBUTING.md, all example projects are run/tested against `behave==1.2.6`.)

- [ ] **Step 2: Create the project's settings**

Create `example-projects/step matching edge cases/.vscode/settings.json`:
```json
{
    "behave-vsc.xRay": true
}
```

- [ ] **Step 3: Create the feature file**

Create `example-projects/step matching edge cases/features/edge_cases.feature` with exactly this content (line numbers matter for later tasks — do not reflow/reformat):
```gherkin
Feature: Step matching edge cases

  This description block deliberately wraps across multiple lines, including one
  and this line starts with the word "and" but is still just feature description text,
  not a step - it appears before any Scenario and must never be treated as one.

  Scenario: multi-line decorator with a trailing comment on its closing paren
    Given a multiline decorated step with a trailing comment
    And a second step defined after the commented decorator

  Scenario: mixed quote implicit string concatenation
    Given a step built from two string literals with different quote characters

  Scenario: trailing colon on the step definition itself
    Given a step definition that itself ends with a colon:

  Scenario Outline: scenario outline placeholder matches a fixed word in the step definition
    Given a step fixed to the word <Word>

    Examples:
      | Word           |
      | specific-value |

  Scenario: docstring containing an and-prefixed line
    Given a step with a docstring argument
      """
      first line of the docstring
      and this line starts with "and" but is inside the docstring, not a step
      """
```

- [ ] **Step 4: Create the step definitions**

Create `example-projects/step matching edge cases/features/steps/multiline_comment_steps.py` — reproduces Category 2 (a multi-line decorator whose closing `)` has a trailing comment currently swallows this decorator and every decorator after it in the file):
```python
# ruff: noqa
from behave import *


@given(
    "a multiline decorated step with a trailing comment"
)  # to be deprecated
def step_multiline_comment(context):
    pass


@given("a second step defined after the commented decorator")
def step_after_commented_decorator(context):
    pass
```

Create `example-projects/step matching edge cases/features/steps/mixed_quote_steps.py` — reproduces Category 3 (implicit string concatenation across a single-quote line and a double-quote line leaves a stray quote character embedded):
```python
# ruff: noqa
from behave import *


@step(
    'a step built from two string literals '
    "with different quote characters"
)
def step_mixed_quotes(context):
    pass
```

Create `example-projects/step matching edge cases/features/steps/trailing_colon_steps.py` — reproduces Category 4 (a step definition whose own text ends in `:` can never match, because only the feature-side text gets its trailing `:` stripped):
```python
# ruff: noqa
from behave import *


@given("a step definition that itself ends with a colon:")
def step_trailing_colon(context):
    pass
```

Create `example-projects/step matching edge cases/features/steps/outline_placeholder_steps.py` — reproduces Category 5 (a Scenario Outline `<Placeholder>` standing where the step definition expects a fixed literal word):
```python
# ruff: noqa
from behave import *


@given("a step fixed to the word specific-value")
def step_fixed_value(context):
    pass
```

Create `example-projects/step matching edge cases/features/steps/docstring_steps.py` — the docstring step needed for Category 6 (the docstring's own content, containing an "and"-prefixed line, must not be mistaken for a step):
```python
# ruff: noqa
from behave import *


@given("a step with a docstring argument")
def step_with_docstring(context):
    assert context.text is not None
```

- [ ] **Step 5: Confirm the fixture is valid, real, passing behave — independent of behave-vsc entirely**

Run:
```bash
cd "/Users/ivoc/GIT/behave-vsc/example-projects/step matching edge cases" && python3 -m behave
```
Expected: `5 scenarios passed, 0 failed, 0 skipped` (one scenario per `Scenario`/`Scenario Outline` block — the Outline's single Examples row counts as its one scenario run). If anything fails, fix the Python/Gherkin content (not behave-vsc) until this passes — this step must be green before continuing, since it proves the fixture itself is valid regardless of any behave-vsc bug.

No commit yet — commit happens at the end of Task 2 once the suite scaffolding around this fixture also exists.

---

### Task 2: Add the integration test suite, register it, and confirm it currently fails (RED)

**Files:**
- Create: `src/_integrationTests/step matching edge cases suite/index.ts`
- Create: `src/_integrationTests/step matching edge cases suite/extension.test.ts`
- Create: `src/_integrationTests/step matching edge cases suite/expectedResults.ts`
- Modify: `src/_integrationTests/runTestSuites.ts` (append a new `runTests(...)` block)
- Modify: `.vscode/launch.json` (append a `Debug: step matching edge cases workspace` and a `Run Test Suite: step matching edge cases workspace` entry)

**Interfaces:**
- Consumes: `SharedWorkspaceTests` from `src/_integrationTests/suite-shared/shared.workspace.tests.ts` (`runDefault`, `runParallel`, `runTogether` — same shape every existing suite uses), `TestResult`/`applyTestConfiguration` from `src/_integrationTests/suite-shared/expectedResults.helpers.ts`, `WkspParseCounts` from `src/parsers/fileParser.ts`.
- Produces: a suite runnable via `npm run test` (once registered) and individually via the throwaway driver in Step 4 below, asserting the **final, all-fixes-applied** target counts — so it is expected to fail (RED) until Task 7 is done.

- [ ] **Step 1: Create `index.ts`** (mirrors every existing suite's `index.ts`, e.g. `src/_integrationTests/simple suite/index.ts`)

```typescript
import { runner } from "../index.helper";

export function run(): Promise<void> {
	return runner("**/step matching edge cases suite/**.test.js");
}
```

- [ ] **Step 2: Create `expectedResults.ts`** with the target (post-all-fixes) counts and results:

```typescript
import * as vscode from 'vscode';
import { Configuration } from "../../configuration";
import { WkspParseCounts } from "../../parsers/fileParser";
import { TestResult, applyTestConfiguration } from "../suite-shared/expectedResults.helpers";

export function getExpectedCounts(wkspUri: vscode.Uri, config: Configuration): WkspParseCounts {
  const testCount = getExpectedResults(wkspUri, config).length;
  return {
    tests: { nodeCount: 6, testCount: testCount },
    featureFilesExceptEmptyOrCommentedOut: 1, stepFilesExceptEmptyOrCommentedOut: 5,
    stepFileStepsExceptCommentedOut: 6, featureFileStepsExceptCommentedOut: 6, stepMappings: 6
  };
}

export const getExpectedResults = (wkspUri: vscode.Uri, config: Configuration): TestResult[] => {

  const expectedResults: TestResult[] = [
    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'multi-line decorator with a trailing comment on its closing paren',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'multi-line decorator with a trailing comment on its closing paren',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/multi-line decorator with a trailing comment on its closing paren',
      test_label: 'multi-line decorator with a trailing comment on its closing paren',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'mixed quote implicit string concatenation',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'mixed quote implicit string concatenation',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/mixed quote implicit string concatenation',
      test_label: 'mixed quote implicit string concatenation',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'trailing colon on the step definition itself',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'trailing colon on the step definition itself',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/trailing colon on the step definition itself',
      test_label: 'trailing colon on the step definition itself',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'scenario outline placeholder matches a fixed word in the step definition',
      scenario_isOutline: true,
      scenario_result: 'passed',
      scenario_scenarioName: 'scenario outline placeholder matches a fixed word in the step definition',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/scenario outline placeholder matches a fixed word in the step definition',
      test_label: 'scenario outline placeholder matches a fixed word in the step definition',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

    new TestResult({
      scenario_featureFileRelativePath: '{{featurePath}}/edge_cases.feature',
      scenario_featureName: 'Step matching edge cases',
      scenario_getLabel: 'docstring containing an and-prefixed line',
      scenario_isOutline: false,
      scenario_result: 'passed',
      scenario_scenarioName: 'docstring containing an and-prefixed line',
      test_children: undefined,
      test_description: undefined,
      test_error: undefined,
      test_id: '.../step matching edge cases/{{featurePath}}/edge_cases.feature/docstring containing an and-prefixed line',
      test_label: 'docstring containing an and-prefixed line',
      test_parent: '.../step matching edge cases/{{featurePath}}/edge_cases.feature',
      test_uri: '.../step matching edge cases/{{featurePath}}/edge_cases.feature'
    }),

  ];

  const wkspSettings = config.workspaceSettings[wkspUri.path];
  return applyTestConfiguration(wkspSettings, expectedResults);
}
```

> Note: `nodeCount: 6` = 1 feature-file node + 5 scenario nodes. If Step 5 below reports a different actual `nodeCount` (e.g. behave-vsc groups differently than expected), correct this file to match the real observed value before proceeding — the counts must reflect reality, not this prediction, but `stepMappings: 6` and `featureFileStepsExceptCommentedOut: 6` (all 6 real steps, zero phantoms) are the actual fix targets and must NOT be weakened.

- [ ] **Step 3: Create `extension.test.ts`** (mirrors `src/_integrationTests/simple suite/extension.test.ts`):

```typescript
import { getExpectedResults } from "./expectedResults";
import { getExpectedCounts } from "./expectedResults";
import { SharedWorkspaceTests } from "../suite-shared/shared.workspace.tests";


suite(`step matching edge cases suite`, () => {
	const folderName = "step matching edge cases";
	const testPre = `runHandler should return expected results for "${folderName}" with configuration:`;
	const sharedWorkspaceTests = new SharedWorkspaceTests(testPre);

	test("runDefault", async () =>
		await sharedWorkspaceTests.runDefault(folderName, getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runParallel", async () =>
		await sharedWorkspaceTests.runParallel(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);

	test("runTogether", async () =>
		await sharedWorkspaceTests.runTogether(folderName, "", getExpectedCounts, getExpectedResults)).timeout(300000);

}).timeout(900000);
```

- [ ] **Step 4: Compile and create a throwaway single-suite driver script (scratchpad, not committed) to iterate quickly**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests
```

Create (NOT inside the `behave-vsc` repo):
```bash
mkdir -p /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes
```
`/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js`:
```javascript
// Throwaway driver: run just the "step matching edge cases" suite quickly during development.
// Do not add this file to the behave-vsc repo.
const path = require('path');
const cp = require('child_process');
const {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} = require('/Users/ivoc/GIT/behave-vsc/node_modules/@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = '/Users/ivoc/GIT/behave-vsc';
  const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
  const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  cp.spawnSync(cliPath, [...cliArgs, '--install-extension', 'ms-python.python'], { encoding: 'utf-8', stdio: 'inherit' });

  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath: path.resolve(extensionDevelopmentPath, 'out/_integrationTests/step matching edge cases suite/index'),
    launchArgs: [path.resolve(extensionDevelopmentPath, 'example-projects/step matching edge cases')]
  });
}

main().catch(err => { console.error(err); process.exitCode = 1; });
```

Run it:
```bash
cd /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes && node run-edge-cases-suite.js
```

- [ ] **Step 5: Confirm RED — the suite currently fails, for the expected reason**

Expected: the run fails (a thrown `AssertionError` mentioning `stepMappings` and/or `nodeCount`/`testCount`, or a scenario-count mismatch). With `behave-vsc.xRay: true` set in Step 2, the console output includes a line like `Processing 1 feature files, 5 step files, producing ... stepMappings ... took ...ms` — read the **actual** numbers there. Confirm they show fewer resolved steps than the 6 asserted (this is the real, current, pre-fix state — categories 2-5 each leave one thing unresolved, and category 6 inflates the feature-step count with 2 phantoms). Do not move on until you've seen this fail for the counts reason, not a typo/setup error.

- [ ] **Step 6: Register the suite in `runTestSuites.ts`**

In `src/_integrationTests/runTestSuites.ts`, after the existing `project B` block and before the `multiroot.code-workspace` block, add:
```typescript
    launchArgs = ["example-projects/step matching edge cases"]
    extensionTestsPath = path.resolve(__dirname, './step matching edge cases suite/index');
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    });

```

- [ ] **Step 7: Add launch.json entries**

In `.vscode/launch.json`, after the `Debug: project B workspace` block (immediately before `Debug: bad import workspace`), add:
```jsonc
			{
				"name": "Debug: step matching edge cases workspace",
				"type": "extensionHost",
				"request": "launch",
				"args": [
					"${workspaceFolder}/example-projects/step matching edge cases",
					"--extensionDevelopmentPath=${workspaceFolder}",
				],
				"outFiles": [
					"${workspaceFolder}/dist/**/*.js"
				],
				"skipFiles": [
					"<node_internals>/**",
					"**/app/out/vs/**"
				],
				"preLaunchTask": "${defaultBuildTask}",
			},
```
And after the `Run Test Suite: project B workspace` block (immediately before `Run Test Suite: multiroot workspace`), add:
```jsonc
			{
				"name": "Run Test Suite: step matching edge cases workspace",
				"type": "extensionHost",
				"request": "launch",
				"args": [
					"${workspaceFolder}/example-projects/step matching edge cases",
					"--extensionDevelopmentPath=${workspaceFolder}",
					"--extensionTestsPath=${workspaceFolder}/out/_integrationTests/step matching edge cases suite/index"
				],
				"outFiles": [
					"${workspaceFolder}/out/**/*.js",
					"${workspaceFolder}/dist/**/*.js"
				],
				"preLaunchTask": "tasks: watch-tests",
			},
```

- [ ] **Step 8: Lint and commit**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run lint
```
Expected: no errors.

```bash
git add "example-projects/step matching edge cases" "src/_integrationTests/step matching edge cases suite" src/_integrationTests/runTestSuites.ts .vscode/launch.json
git commit -m "Add step matching edge cases fixture and suite (RED, pre-fix)"
```

---

### Task 3: Fix Category 2 — multi-line decorator with a trailing comment swallows following decorators

**Files:**
- Modify: `src/parsers/stepsParser.ts:104-115`

**Interfaces:**
- No signature changes — `parseStepsFileContent`'s external behavior (return type, side effects on the `stepFileSteps` map) is unchanged; only which lines correctly close multi-line accumulation changes.

- [ ] **Step 1: Apply the fix**

Replace this block in `src/parsers/stepsParser.ts` (currently lines 104-115):
```typescript
    if (multiLineBuilding) {
      if (line.endsWith(")")) {
        multiLine += line.replaceAll(`)$`, "");
        multiLine = multiLine.replaceAll("''", "");
        multiLine = multiLine.replaceAll('""', "");
        multiLineBuilding = false;
      }
      else {
        multiLine += line;
        continue;
      }
    }
```
with:
```typescript
    if (multiLineBuilding) {
      // a closing ")" may be followed by a trailing comment, e.g. `)  # to be deprecated` - strip
      // the comment before checking/appending, otherwise this line is treated as "not closed yet"
      // and every following line (including later decorators) gets swallowed into this one step.
      const closesMultiLineRe = /\)\s*(#.*)?$/;
      if (closesMultiLineRe.test(line)) {
        const lineWithoutTrailingComment = line.replace(/#.*$/, "").trimEnd();
        multiLine += lineWithoutTrailingComment.replaceAll(`)$`, "");
        multiLine = multiLine.replaceAll("''", "");
        multiLine = multiLine.replaceAll('""', "");
        multiLineBuilding = false;
      }
      else {
        multiLine += line;
        continue;
      }
    }
```

- [ ] **Step 2: Rebuild and re-run the suite**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests && node /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js
```

- [ ] **Step 3: Verify the expected, specific improvement**

Expected: the `stepMappings` count reported in the xRay console output increases by exactly **2** compared to Task 2 Step 5's observed baseline (both `multiline_comment_steps.py` steps — lines 8 and 9 of `edge_cases.feature` — now resolve). The suite as a whole may still fail overall (categories 3-6 remain unfixed) — that is expected; only the specific improvement matters here. If the increase isn't exactly 2, or something else changed unexpectedly, investigate before proceeding — don't just accept "some number went up."

- [ ] **Step 4: Run the full existing suite for regressions on this file**

Run:
```bash
npm run test
```
Expected: the `step matching edge cases suite` still fails overall (expected at this point), but every *other* existing suite passes exactly as before. If any other suite now fails, this fix broke something else — investigate before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/stepsParser.ts
git commit -m "Fix multi-line step decorator with a trailing comment on its closing paren"
```

---

### Task 4: Fix Category 3 — mixed-quote implicit string concatenation leaves a stray quote character

**Files:**
- Modify: `src/parsers/stepsParser.ts` (the two `multiLine.replaceAll(...)` lines added/kept by Task 3, immediately below them)

**Interfaces:**
- No signature changes.

- [ ] **Step 1: Apply the fix**

In `src/parsers/stepsParser.ts`, immediately after these two lines (present since Task 3):
```typescript
        multiLine = multiLine.replaceAll("''", "");
        multiLine = multiLine.replaceAll('""', "");
```
add:
```typescript
        // Python allows implicit concatenation between literals using DIFFERENT quote characters
        // too (e.g. '...' "..."), leaving a stray quote pair of mixed characters embedded - strip
        // those as well, the same way same-quote pairs are stripped above.
        multiLine = multiLine.replaceAll(`'"`, "");
        multiLine = multiLine.replaceAll(`"'`, "");
```

- [ ] **Step 2: Rebuild and re-run**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests && node /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js
```

- [ ] **Step 3: Verify the expected, specific improvement**

Expected: `stepMappings` increases by exactly **1** more than Task 3's result (line 12, `mixed_quote_steps.py`'s step, now resolves).

- [ ] **Step 4: Run the full existing suite for regressions**

Run:
```bash
npm run test
```
Expected: same as Task 3 Step 4 — only this new suite still fails overall; nothing else regresses.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/stepsParser.ts
git commit -m "Fix mixed-quote implicit string concatenation leaving a stray quote in step regex"
```

---

### Task 5: Fix Category 4 — a trailing `:` on the step definition itself is never stripped

**Files:**
- Modify: `src/parsers/stepsParser.ts:144-148` (`createStepFileStepAndReKey`)

**Interfaces:**
- No signature changes.

- [ ] **Step 1: Apply the fix**

Replace the start of `createStepFileStepAndReKey` in `src/parsers/stepsParser.ts` (currently):
```typescript
function createStepFileStepAndReKey(featuresUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[2];
  let textAsRe = step[3].trim();
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
```
with:
```typescript
function createStepFileStepAndReKey(featuresUri: vscode.Uri, fileUri: vscode.Uri, range: vscode.Range, step: RegExpExecArray) {
  const stepType = step[2];
  let textAsRe = step[3].trim();
  if (textAsRe.endsWith(":")) // mirror the same trailing-colon stripping applied to feature-file step text in stepMappings.ts, so a step definition whose own text ends in ":" can still match
    textAsRe = textAsRe.slice(0, -1);
  textAsRe = textAsRe.replace(/[.*+?^$()|[\]]/g, '\\$&'); // escape any regex chars except for \ { }
  textAsRe = textAsRe.replace(/{.*?}/g, parseRepWildcard);
```

- [ ] **Step 2: Rebuild and re-run**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests && node /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js
```

- [ ] **Step 3: Verify the expected, specific improvement**

Expected: `stepMappings` increases by exactly **1** more than Task 4's result (line 15, `trailing_colon_steps.py`'s step, now resolves).

- [ ] **Step 4: Run the full existing suite for regressions**

Run:
```bash
npm run test
```
Expected: same pattern as before.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/stepsParser.ts
git commit -m "Fix trailing colon on a step definition never being stripped to match"
```

---

### Task 6: Fix Category 5 — Scenario Outline `<Placeholder>` matching a fixed literal word

**Files:**
- Modify: `src/parsers/stepMappings.ts`

**Interfaces:**
- Produces (new, internal to this file, not exported): `findOutlinePlaceholderMatch(textWithoutType: string, stepType: string, candidates: Map<string, StepFileStep>): StepFileStep | undefined`.
- `_getStepFileStepMatch`'s external signature and return type (`StepFileStep | null`) are unchanged.

- [ ] **Step 1: Apply the fix**

In `src/parsers/stepMappings.ts`, add this constant near the top, after the `let stepMappings: StepMapping[] = [];` line:
```typescript
const outlinePlaceholderRe = /<[^>]+>/;
```

Then replace the end of `_getStepFileStepMatch` (currently):
```typescript
  // more than one parameters match - get longest matched key      
  if (paramsMatches.size > 1) {
    return findLongestParamsMatch(paramsMatches);
  }

  // no matching step
  return null;
}
```
with:
```typescript
  // more than one parameters match - get longest matched key      
  if (paramsMatches.size > 1) {
    return findLongestParamsMatch(paramsMatches);
  }

  // fallback for Scenario Outline steps: a "<Placeholder>" stands in for a value that is only
  // known once behave substitutes an Examples row, so it can't be resolved as either a literal
  // word or a {param} wildcard by the checks above. Build a pattern FROM the feature step's own
  // text (escaping it, then treating "<Placeholder>" as a wildcard exactly like {param} is treated
  // on the definition side) and test it against each candidate definition's own text - this
  // correctly matches an outline placeholder that stands where the definition expects a fixed
  // literal word. (This does not resolve a placeholder against a definition that ALSO has a
  // {param} at that same position with other ambiguous literal text nearby - that remains a
  // known, accepted gap given the rarity of that combination.)
  if (outlinePlaceholderRe.test(textWithoutType)) {
    const allCandidates = new Map([...exactSteps, ...paramsSteps]);
    let outlineMatch = findOutlinePlaceholderMatch(textWithoutType, featureFileStep.stepType, allCandidates);
    if (!outlineMatch && featureFileStep.stepType !== "step")
      outlineMatch = findOutlinePlaceholderMatch(textWithoutType, "step", allCandidates);
    if (outlineMatch)
      return outlineMatch;
  }

  // no matching step
  return null;
}


function findOutlinePlaceholderMatch(textWithoutType: string, stepType: string,
  candidates: Map<string, StepFileStep>): StepFileStep | undefined {
  let pattern = textWithoutType.replace(/[.*+?^$()|[\]]/g, '\\$&');
  pattern = pattern.replace(/<[^>]+>/g, parseRepWildcard);
  const rx = new RegExp(`^${stepType}${sepr}${pattern}$`, "i");
  for (const [, value] of candidates) {
    if (rx.test(`${stepType}${sepr}${value.textAsRe}`))
      return value;
  }
}
```

- [ ] **Step 2: Rebuild and re-run**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests && node /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js
```

- [ ] **Step 3: Verify the expected, specific improvement**

Expected: `stepMappings` increases by exactly **1** more than Task 5's result (line 18, the Scenario Outline's `<Word>` step, now resolves to `outline_placeholder_steps.py`).

- [ ] **Step 4: Run the full existing suite for regressions**

Run:
```bash
npm run test
```
Pay particular attention to `project B suite` (its `outline_mixed.feature` and other outline fixtures) — this change touches the shared matching function every outline step goes through. Expected: it still passes exactly as before (this fixture's placeholders already sit on `{param}` positions, which the pre-existing code path already resolved; this fallback should never even trigger for it).

- [ ] **Step 5: Commit**

```bash
git add src/parsers/stepMappings.ts
git commit -m "Resolve Scenario Outline placeholders against a fixed-literal-word step definition"
```

---

### Task 7: Fix Category 6 — Feature-description and docstring prose mis-detected as phantom steps

**Files:**
- Modify: `src/parsers/featureParser.ts:70-128` (`parseFeatureContent`'s line loop)

**Interfaces:**
- No signature changes to `parseFeatureContent` or any exported function.

- [ ] **Step 1: Apply the fix**

In `src/parsers/featureParser.ts`, inside `parseFeatureContent`, add two new local variables right after the existing `let lastStepType = "given";` line:
```typescript
  let inFeatureDescription = false;
  let inDocstring = false;
  const backgroundRe = /^\s*Background:/i;
```

Then replace the entire `for` loop body (currently):
```typescript
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    // get indent before we trim
    const indent = lines[lineNo].match(/^\s*/);
    const indentSize = indent && indent[0] ? indent[0].length : 0;

    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith("#")) {
      continue;
    }

    const step = featureFileStepRe.exec(line);
    if (step) {
      const text = step[0].trim();
      const matchText = step[2].trim();

      let stepType = step[1].trim().toLowerCase();
      if (stepType === "and" || stepType === "but")
        stepType = lastStepType;
      else
        lastStepType = stepType;

      const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
      const key = `${uriId(uri)}${sepr}${range.start.line}`;
      featureFileSteps.set(key, new FeatureFileStep(key, uri, fileName, range, text, matchText, stepType));
      fileSteps++;
      continue;
    }

    const scenario = scenarioRe.exec(line);
    if (scenario) {
      const scenarioName = scenario[2].trim();
      const isOutline = scenarioOutlineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, scenarioName, isOutline);
      fileScenarios++;
      continue;
    }

    const feature = featureRe.exec(line);
    if (feature) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureLine(range);
    }

  }
```
with:
```typescript
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {

    // get indent before we trim
    const indent = lines[lineNo].match(/^\s*/);
    const indentSize = indent && indent[0] ? indent[0].length : 0;

    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith('"""')) {
      // toggle in/out of a docstring block - its content (which may start with "and"/"but") must
      // never be mistaken for a step, and it cannot itself contain a scenario/feature line
      inDocstring = !inDocstring;
      continue;
    }

    if (!inDocstring && !inFeatureDescription) {
      const step = featureFileStepRe.exec(line);
      if (step) {
        const text = step[0].trim();
        const matchText = step[2].trim();

        let stepType = step[1].trim().toLowerCase();
        if (stepType === "and" || stepType === "but")
          stepType = lastStepType;
        else
          lastStepType = stepType;

        const range = new vscode.Range(new vscode.Position(lineNo, indentSize), new vscode.Position(lineNo, indentSize + step[0].length));
        const key = `${uriId(uri)}${sepr}${range.start.line}`;
        featureFileSteps.set(key, new FeatureFileStep(key, uri, fileName, range, text, matchText, stepType));
        fileSteps++;
        continue;
      }
    }

    if (inDocstring) {
      continue;
    }

    const scenario = scenarioRe.exec(line);
    if (scenario) {
      inFeatureDescription = false;
      const scenarioName = scenario[2].trim();
      const isOutline = scenarioOutlineRe.exec(line) !== null;
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, scenario[0].length));
      onScenarioLine(range, scenarioName, isOutline);
      fileScenarios++;
      continue;
    }

    if (backgroundRe.test(line)) {
      inFeatureDescription = false;
      continue;
    }

    const feature = featureRe.exec(line);
    if (feature) {
      const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, line.length));
      onFeatureLine(range);
      inFeatureDescription = true;
    }

  }
```

- [ ] **Step 2: Rebuild and re-run**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests && node /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-matching-fixes/run-edge-cases-suite.js
```

- [ ] **Step 3: Verify this is now fully GREEN**

Expected: `featureFileStepsExceptCommentedOut` drops to exactly **6** (the 2 phantom lines — the feature-description line and the docstring line — are no longer counted), `stepMappings` is exactly **6** (all of them, matching Task 6's real count exactly since fixing this category doesn't add any new resolution, only removes phantoms), and the suite run now **passes** (`runDefault` succeeds). If `expectedResults.ts`'s `nodeCount`/`testCount` need correcting to match reality (per the note left in Task 2 Step 2), correct them now and re-run until green.

- [ ] **Step 4: Run the full existing suite — this must be fully green with zero regressions**

Run:
```bash
npm run test
```
Expected: every suite passes, including the new `step matching edge cases suite` (now fully green) and, in particular, `project A suite`/`project B suite` (which exercise existing `Background:` and docstring fixtures — confirm their counts are unchanged from before this task). This is the final safety net for this whole plan — do not consider Task 7 done until this is 100% green.

- [ ] **Step 5: Commit**

```bash
git add src/parsers/featureParser.ts
git commit -m "Stop misdetecting Feature-description and docstring prose as phantom steps"
```

If Task 2's `expectedResults.ts` needed correction in Step 3 above, include it in this commit (or a preceding one) with its own message, e.g. `git add "src/_integrationTests/step matching edge cases suite/expectedResults.ts" && git commit -m "Correct expected node/test counts for step matching edge cases suite"`.

---

### Task 8: Re-run the real-world audit to confirm the fixes generalize beyond the fixture

**Files:**
- None inside `behave-vsc` or `vertice-test-suites-python` — this task only re-runs the existing throwaway audit script from the prior plan.

**Interfaces:**
- Consumes: the audit script at `/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/{auditEntry.js,run-audit.js}` (created by the prior plan, `docs/superpowers/plans/2026-08-11-fix-unresolved-step-names.md`) — if it no longer exists in your scratchpad, recreate it exactly per that plan's Tasks 2-3 (the corrected versions, per that plan's "Correction" notes) before continuing.

- [ ] **Step 1: Rebuild and re-run the real-world audit**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile && npm run compile-tests
cd /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit && node run-audit.js
node -e "const r = require('./report.json'); console.log(r.totalFeatureSteps, r.unresolvedCount); console.log(JSON.stringify(r.unresolved, null, 2));"
```

- [ ] **Step 2: Confirm the improvement**

Expected: `unresolvedCount` is now **0** (down from 67), given all 5 confirmed categories are now fixed. If it is not 0, read the printed `unresolved` entries — each one is either a genuine new finding (investigate and, if it's a real behave-vsc bug, treat it the same way as Tasks 3-7: fixture, fix, regression test) or confirms the one documented residual gap from Task 6 (an outline placeholder combined with a `{param}`-plus-literal ambiguity at the same position) — if so, note it plainly, do not attempt to force a fix for it under this task.

- [ ] **Step 3: Record the result**

No commit needed (the audit script and its report are scratchpad-only), but report the final `unresolvedCount` and, if non-zero, the specific remaining entries and why, as the final summary of this plan's work.
