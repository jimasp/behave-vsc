# Fix Unresolved Step Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a throwaway audit tool that uses `behave-vsc`'s own step-matching code to find every feature-file step in `vertice-test-suites-python` that "Go to Step Definition" cannot resolve, then categorize why.

**Architecture:** A Node driver script launches a real VS Code extension host (via `@vscode/test-electron`, the same mechanism `npm run test` already uses) with `behave-vsc` loaded from source and `vertice-test-suites-python` open as the workspace. Inside that host, a small entry-point module waits for `behave-vsc` to finish parsing, then directly imports the compiled `getFeatureFileSteps`/`getStepMappings` functions from `behave-vsc`'s own `out/` build to compute (all feature steps) minus (steps present in step mappings) = the unresolved set, and writes it to a JSON report.

**Tech Stack:** Node.js, `@vscode/test-electron` (already a devDependency of `behave-vsc`), the real `vscode` extension host API, `behave-vsc`'s own compiled TypeScript output.

## Global Constraints

- The audit script (driver + entry point) is throwaway: it lives entirely in the scratchpad directory, is never added to the `behave-vsc` git repo, and is not turned into a supported extension feature.
- `vertice-test-suites-python/manual/` is out of scope for the audit (excluded by request, and outside `behave.ini`'s `paths=features/` anyway).
- No changes are made to `vertice-test-suites-python` in this plan — any genuine issues found there are written up as proposals for separate review.
- Success for this plan's scope is a categorized report, not a fix count — every unresolved step found must end up explained, not just counted.

---

### Task 1: Compile `behave-vsc` so its internals are importable from plain Node

**Files:**
- None created or modified — this task only runs an existing npm script and verifies its output.

**Interfaces:**
- Produces: a populated `out/` directory in `/Users/ivoc/GIT/behave-vsc` containing plain CommonJS builds of every module under `src/`, including `out/common.js`, `out/configuration.js`, `out/parsers/featureParser.js`, `out/parsers/stepMappings.js`. Task 2 requires these to exist.

- [ ] **Step 1: Compile the TypeScript sources (including test/parser internals) to `out/`**

Run:
```bash
cd /Users/ivoc/GIT/behave-vsc && npm run compile-tests
```
Expected: exits 0, no `tsc` errors printed.

- [ ] **Step 2: Verify the modules the audit script depends on were actually produced**

Run:
```bash
test -f /Users/ivoc/GIT/behave-vsc/out/common.js && \
test -f /Users/ivoc/GIT/behave-vsc/out/configuration.js && \
test -f /Users/ivoc/GIT/behave-vsc/out/parsers/featureParser.js && \
test -f /Users/ivoc/GIT/behave-vsc/out/parsers/stepMappings.js && \
echo OK
```
Expected: prints `OK`.

No commit — nothing in the repo changed.

---

### Task 2: Write the in-extension-host audit entry point

**Files:**
- Create (scratchpad, not part of the `behave-vsc` repo): `/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/auditEntry.js`

> **Correction (found while executing Task 3):** the first version of this task required `getFeatureFileSteps`/`getStepMappings` from a **separately-required copy** of `out/parsers/featureParser.js` / `out/parsers/stepMappings.js`. That copy is a different Node module instance from the one webpack bundled into `dist/extension.js` (the file VS Code actually loads as the extension's `main`) — webpack inlines `featureParser.ts`/`stepMappings.ts` as private closures inside that bundle, so they are not reachable via Node's `require` cache at all. The separately-required copy's internal `Map`s/arrays are real but permanently empty, because nothing ever calls that copy's own `parseFeatureContent`/`parseStepsFileContent`. Running the original version produced a "successful" but meaningless `0/0` report. The corrected version below reads feature steps by independently walking the real `.feature` files with the same (stateless, therefore safely reusable) `featureFileStepRe` regex and `findFiles`/`getLines` helpers, and checks resolution through `testSupport.getStepFileStepForFeatureFileStep(uri, lineNo)` — a real reference into the running extension's live, correctly-populated state, obtained via `activate()`.

**Interfaces:**
- Consumes (from Task 1's `out/` build — only stateless exports, safe to use from a separately-required module instance):
  - `out/common.js` → `getLines(text: string): string[]`, `findFiles(directory: vscode.Uri, matchSubDirectory: string | undefined, extension: string, cancelToken: vscode.CancellationToken): Promise<vscode.Uri[]>`
  - `out/parsers/featureParser.js` → the regex constant `featureFileStepRe = /^\s*(Given |When |Then |And |But )(.*)/i`
  - The real `vscode` module's `vscode.extensions.getExtension("jimasp.behave-vsc")` → `.activate()` returns the `TestSupport` shape from `src/extension.ts` — a live reference into the actually-running extension, not a fresh module instance:
    - `config.workspaceSettings: { [wkspUriPath: string]: WorkspaceSettings }`, where `WorkspaceSettings.featuresUri: vscode.Uri`
    - `parser.stepsParseComplete(timeoutMs, caller): Promise<boolean>`, resolves `true` once all workspaces have finished parsing feature and step files
    - `getStepFileStepForFeatureFileStep(featureFileUri: vscode.Uri, lineNo: number): StepFileStep | undefined` (0-indexed `lineNo`) — `undefined` means unresolved
- Produces: `report.json` written next to this file, and the required VS Code extension-test-host export `exports.run = async function(): Promise<void>` (mirrors the pattern in `src/_integrationTests/simple suite/index.ts`).

- [ ] **Step 1: Create the scratchpad folder**

Run:
```bash
mkdir -p /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit
```

- [ ] **Step 2: Write `auditEntry.js`**

```javascript
// Throwaway diagnostic script - runs inside a real VS Code extension host.
// Finds every feature-file step in the open workspace that behave-vsc's
// stepMappings did NOT resolve to a step definition.
//
// IMPORTANT: this file must never require getFeatureFileSteps/getStepMappings
// (or any other function backed by mutable module-level state) from a
// separately-required copy of behave-vsc's out/ build. That copy is a
// different module instance from the one webpack bundled into
// dist/extension.js, so its internal Maps are always empty. Only stateless
// exports (regex constants, pure helpers) are safe to import that way -
// anything reflecting the extension's real parsed state must come through
// `testSupport`, the live object activate() returned inside the running
// extension.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/Users/ivoc/GIT/behave-vsc/out';
const REPORT_PATH = path.join(__dirname, 'report.json');

const { featureFileStepRe } = require(path.join(OUT_DIR, 'parsers', 'featureParser'));
const { getLines, findFiles } = require(path.join(OUT_DIR, 'common'));

exports.run = async function () {
  const extension = vscode.extensions.getExtension('jimasp.behave-vsc');
  if (!extension) {
    throw new Error('behave-vsc extension was not found in this extension host');
  }

  const testSupport = extension.isActive ? extension.exports : await extension.activate();

  const ready = await testSupport.parser.stepsParseComplete(120000, 'step-audit');
  if (!ready) {
    throw new Error('behave-vsc did not finish parsing steps within the timeout');
  }

  const wkspUris = vscode.workspace.workspaceFolders.map(f => f.uri);
  const unresolved = [];
  let totalFeatureSteps = 0;
  const cancelToken = new vscode.CancellationTokenSource().token;

  for (const wkspUri of wkspUris) {
    const wkspSettings = testSupport.config.workspaceSettings[wkspUri.path];
    if (!wkspSettings) {
      continue; // this folder has no recognised features path
    }

    const featureFiles = await findFiles(wkspSettings.featuresUri, undefined, '.feature', cancelToken);

    for (const fileUri of featureFiles) {
      const content = fs.readFileSync(fileUri.fsPath, 'utf8');
      const lines = getLines(content);
      let lastStepType = 'given';

      for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo].trim();
        if (line === '' || line.startsWith('#')) {
          continue;
        }

        const step = featureFileStepRe.exec(line);
        if (!step) {
          continue;
        }

        let stepType = step[1].trim().toLowerCase();
        if (stepType === 'and' || stepType === 'but') {
          stepType = lastStepType;
        } else {
          lastStepType = stepType;
        }

        totalFeatureSteps++;

        const match = testSupport.getStepFileStepForFeatureFileStep(fileUri, lineNo);
        if (!match) {
          unresolved.push({
            file: fileUri.fsPath,
            line: lineNo + 1,
            stepType,
            text: step[0].trim()
          });
        }
      }
    }
  }

  unresolved.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  const report = {
    generatedAt: new Date().toISOString(),
    workspacePaths: wkspUris.map(u => u.fsPath),
    totalFeatureSteps,
    unresolvedCount: unresolved.length,
    unresolved
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`step-audit: ${unresolved.length}/${totalFeatureSteps} feature steps unresolved. Report: ${REPORT_PATH}`);
};
```

- [ ] **Step 3: Syntax-check the file (it cannot be executed outside a real extension host, so this is a parse check only)**

Run:
```bash
node --check /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/auditEntry.js
```
Expected: no output, exit code 0.

No commit — file lives outside the `behave-vsc` git repo.

---

### Task 3: Write the driver script and run the audit end-to-end

**Files:**
- Create (scratchpad): `/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/run-audit.js`

**Interfaces:**
- Consumes: `@vscode/test-electron`'s `downloadAndUnzipVSCode(version)`, `resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath)`, `runTests(options)` (already a devDependency at `/Users/ivoc/GIT/behave-vsc/node_modules/@vscode/test-electron`, version 2.1.3 — same API `src/_integrationTests/runTestSuites.ts` already uses), and Task 2's `auditEntry.js`.
- Produces: `/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/report.json` (written by `auditEntry.js` when it runs inside the launched host).

- [ ] **Step 1: Write `run-audit.js`**

```javascript
// Throwaway driver: launches a real VS Code extension host with behave-vsc
// loaded from source, opens vertice-test-suites-python as the workspace,
// and runs auditEntry.js inside it.
const cp = require('child_process');
const path = require('path');
const {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests
} = require('/Users/ivoc/GIT/behave-vsc/node_modules/@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = '/Users/ivoc/GIT/behave-vsc';
  const workspacePath = '/Users/ivoc/GIT/vertice-test-suites-python';
  const extensionTestsPath = path.resolve(__dirname, 'auditEntry.js');

  console.log('checking/downloading vscode stable...');
  const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

  console.log('installing ms-python.python (behave-vsc extension dependency)...');
  const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  const installResult = cp.spawnSync(cliPath, [...cliArgs, '--install-extension', 'ms-python.python'], {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  if (installResult.error) {
    throw installResult.error;
  }

  console.log(`launching extension host against ${workspacePath} ...`);
  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [workspacePath]
  });

  console.log('done - see report.json next to this script');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
```

> **Correction (found while executing this task):** the audit launches the extension host with `extensionDevelopmentPath` set, which makes VS Code load the extension via `package.json`'s `"main": "./dist/extension.js"` — the **webpack bundle**, not the `out/` tsc output Task 1 builds. `dist/` is gitignored. The first run of this task used a stale `dist/extension.js` left over from an old build (predating recent commits) and got a false `10352/10394 unresolved` result — the stale bundle had the `{param}`→wildcard substitution and regex-escaping in the wrong order, breaking almost all parameterized step matching. **Before running Step 2, always run `npm run compile` (webpack; rebuilds `dist/`) then `npm run compile-tests` again (its `clean-output` step wipes `out/` too).** After rebuilding both correctly, the real re-run reported `67/10394 unresolved` — an exact match to an independent offline reproduction, confirmed in `task-4-verification-report.md`.

- [ ] **Step 2: Run the audit**

Run (from the `step-audit` directory; this downloads VS Code on first run and can take a few minutes):
```bash
cd /private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit && node run-audit.js
```
Expected: ends with `done - see report.json next to this script`, and prints a line like `step-audit: N/M feature steps unresolved. Report: .../report.json` somewhere in the extension host's forwarded console output.

- [ ] **Step 3: Verify the report was written and sanity-check its shape**

Run:
```bash
node -e "const r = require('/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/report.json'); console.log(r.totalFeatureSteps, r.unresolvedCount, r.unresolved.length === r.unresolvedCount);"
```
Expected: prints two positive numbers followed by `true`, and `unresolvedCount <= totalFeatureSteps`.

No commit — script and report are throwaway, outside the `behave-vsc` repo.

---

### Task 4: Categorize the unresolved steps by root cause

**Files:**
- Create (scratchpad): `/private/tmp/claude-501/-Users-ivoc-GIT-behave-vsc/e18528a4-1bfd-4f8e-a7fe-5fd0ef112138/scratchpad/step-audit/categorized-report.md`

**Interfaces:**
- Consumes: `report.json` from Task 3.
- Produces: a human-readable categorization to drive the (separately planned) fix work, and to show the user before any `behave-vsc` source is touched.

- [ ] **Step 1: For each unresolved entry, find the step definition that *should* match**

For each `{file, line, stepType, text}` in `report.json`'s `unresolved` array, search the step sources for the closest candidate decorator, e.g.:
```bash
grep -rn "distinctive words from the step text" /Users/ivoc/GIT/vertice-test-suites-python/features/steps
grep -rn "distinctive words from the step text" "/Users/ivoc/GIT/vertice-test-suites-python/.venv/lib/python3.11/site-packages/vertice_testability"
```
Record, per entry: the candidate decorator line (if one exists) or "no candidate found" (likely a genuine orphaned/typo'd step in the test-suite repo).

- [ ] **Step 2: Group entries that share the same failure shape**

Cluster entries whose candidate decorator fails to match for the same structural reason (e.g. same parameter syntax `stepMappings.ts`/`stepsParser.ts` doesn't translate, same decorator form `stepFileStepStartRe` doesn't recognize, same step-type mismatch). Name each group.

- [ ] **Step 3: For each group, pin down the exact code reason**

Point at the exact regex/line in `/Users/ivoc/GIT/behave-vsc/src/parsers/stepsParser.ts` or `/Users/ivoc/GIT/behave-vsc/src/parsers/stepMappings.ts` responsible, and write one sentence explaining why it fails on this shape. For entries with "no candidate found" in Step 1, note them separately as likely genuine `vertice-test-suites-python` issues, not `behave-vsc` bugs.

- [ ] **Step 4: Write `categorized-report.md`**

Structure:
```markdown
# Unresolved step categorization

Generated from report.json (<totalFeatureSteps> steps checked, <unresolvedCount> unresolved).

## Category: <name>
Root cause: <one sentence, with file:line reference into behave-vsc source>
Count: <n>
Examples:
- <file>:<line> `<text>`
- <file>:<line> `<text>`

## Category: <name>
...

## Likely genuine vertice-test-suites-python issues (no plugin bug found)
- <file>:<line> `<text>` — <why: e.g. "no step definition text resembles this anywhere in features/steps or extraStepPaths">
```

Fill in every category found in Steps 2-3 — do not leave a category without its root-cause sentence and example list.

No commit — this file is analysis output, kept in the scratchpad alongside the report it was derived from.

---

## Task 4 results (confirmed)

Tasks 1-3 were re-run against a correctly rebuilt `dist/extension.js` (see the correction note under Task 3). The real, in-extension-host result: **67 of 10394 feature-file steps (0.64%) genuinely unresolved**, confirmed by an independent offline reproduction landing on the exact same number, and every one of the 67 maps cleanly onto one of 5 categories below — zero unmapped entries, and **zero genuine orphaned/typo'd steps found in `vertice-test-suites-python`**. Full detail, proofs, and repro scripts: `categorized-report.md` and `offline/` in the `step-audit` scratchpad directory (ephemeral — the table below is the durable record).

| # | Category | Count | Root cause |
|---|----------|------:|------------|
| 2 | Trailing comment after a multi-line decorator's closing `)` swallows that decorator and every decorator after it in the file | 36 | `src/parsers/stepsParser.ts:105` ends multi-line accumulation only on `line.endsWith(")")`, so `)  # to be deprecated` never terminates it — `multiLineBuilding` stays `true` and everything following (more decorators, `def`, function body) gets glued into one unparseable blob. |
| 3 | Implicit Python string concatenation across mixed quote characters leaves a stray quote embedded in the generated regex | 26 | `src/parsers/stepsParser.ts:112` concatenates continuation lines verbatim; the cleanup at `stepsParser.ts:107-108` only strips an adjacent *same*-quote pair (`''`/`""`), so a `'…' "…"` boundary leaves a literal `'"` that can never appear in real feature text. |
| 4 | A trailing `:` is stripped from the feature step but never from the step-definition key | 1 | `src/parsers/stepMappings.ts:141-142` strips a trailing colon from the feature step's text (to match behave's own "table step" behaviour) but the key built at `src/parsers/stepsParser.ts:152` keeps its own trailing `:`, so a decorator whose text ends in `:` can never match. |
| 5 | Scenario Outline `<placeholder>` text is not substituted before matching | 1 | `src/parsers/featureParser.ts:94-107` stores the raw `<Placeholder>` text as-is; `src/parsers/stepMappings.ts:98` matches that literal against the step regex, so a placeholder standing where the definition expects fixed words (not a `{param}`) cannot match. Documented matcher limitation, not a regression. |
| 6 | Feature-description / docstring prose lines starting with "And"/"But" are mis-detected as phantom steps | 3 | `src/parsers/featureParser.ts:94` applies `featureFileStepRe` (`featureParser.ts:13`) to every non-blank, non-`#` line with no state tracking for the Feature description block or `"""` docstrings, so narrative prose starting with those words becomes an unresolvable phantom step (and is drawn with the "missing step" highlight in the editor). |

Two repo-side observations (not the cause of any unresolved step, recorded for completeness): a stray `"` typo inside one vendored-package decorator's text (`vertice_testability/behave/provisioning.py:459`) that no feature file happens to use; and 3 duplicate step-definition texts across the suite that collapse to one `StepFileStep` each (intentional de-duplication in `behave-vsc`, but means "Go to Step Definition" picks the last-parsed one — worth knowing, not a bug).

## Follow-up (not yet planned — ready to plan from the results above)

This plan intentionally stopped at a categorized report; the results above make the remaining work concrete. The design doc's remaining steps — fix each category with a regression fixture under `example-projects/` + a matching suite under `src/_integrationTests/` (registered in `runTestSuites.ts` and `.vscode/launch.json`), re-run the audit to confirm, and write up the two repo-side observations for separate review — should become a fresh plan with one task per category above, each following this shape:

1. Write a failing integration test (new or extended `example-projects/*` fixture + `src/_integrationTests/*` suite) reproducing the category.
2. Fix the root cause at the exact file:line identified above.
3. Run `npm run test` to confirm the new suite passes and nothing else regressed.
4. Commit.
5. Rebuild `dist/` (`npm run compile`) and re-run the Task 3 audit script to confirm real-world steps in that category now resolve, then restore `out/` (`npm run compile-tests`) if continuing to the next category.
