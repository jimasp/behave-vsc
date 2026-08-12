# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Behave VSC is a VS Code extension (TypeScript) that runs/debugs Python `behave` BDD tests via the native VS Code Test API, and provides Gherkin editing support (step navigation, autocomplete, syntax highlighting, formatting). It is pre-release (< v1.0.0); the code is expected to still churn, and PRs are generally only accepted for bug fixes (see CONTRIBUTING.md).

## Commands

- `npm run compile` — clean and build via webpack (dev build, into `dist/`)
- `npm run watch` — clean and build with webpack in watch mode
- `npm run compile-tests` / `npm run watch-tests` — compile test TypeScript (`src/`) to `out/` via `tsc`
- `npm run lint` — eslint over `src` (`.ts` files)
- `npm run test` — full pretest (compile + compile-tests + lint) then runs all integration test suites headlessly via `node ./out/_integrationTests/runTestSuites.js --stable` (downloads/launches real VS Code + installs `ms-python.python`). Requires `behave==1.2.6` and Python installed globally. Takes several minutes.
- `npm run testinsiders` — same, against VS Code Insiders

There is no unit test layer — all automated tests are integration tests that spin up a real VS Code extension host against the example projects in `example-projects/`.

### Running a single test suite

Each suite under `src/_integrationTests/<suite name> suite/` corresponds to one example project workspace and is launched independently. To run/debug just one suite (much faster than `npm run test`), use the VS Code Run & Debug panel (`Ctrl+Shift+D`) and pick a `Run Test Suite: <name>` launch config (see `.vscode/launch.json`), or hit F5 if it's already selected. To debug the extension itself against an example project interactively (not as an automated test), use one of the `Debug: <name> workspace` launch configs instead.

Integration test suites currently defined: `simple`, `multiroot`, `project A`, `project B`, `sibling steps folder 1/2/3`. Each has an `expectedResults.ts` (expected test outcomes) and `extension.test.ts` (assertions), sharing common logic from `src/_integrationTests/suite-shared/`.

## Architecture

### Startup flow (`src/extension.ts`)

`activate()` is the entry point: it must return fast (no top-level `await` beyond what's necessary) because it only registers things. It creates a `vscode.TestController`, kicks off an initial parse of all workspace folders containing `*.feature` files, starts filesystem watchers per workspace, starts a `JunitWatcher`, and registers commands/providers/run profiles. It returns a `TestSupport` object exposing internals — this is consumed only by the integration tests (`activate()`'s return value is how tests reach into the running extension).

### Parsing pipeline (`src/parsers/`)

- `fileParser.ts` (`FileParser`) — orchestrates parsing of `.feature` files and step (`.py`) files into `vscode.TestItem` tree nodes, keyed by a `TestData` `WeakMap<vscode.TestItem, BehaveTestData>` (see `testFile.ts`). Reparses happen both from filesystem watcher events and from live text-document edits (so semantic highlighting and step-nav stay in sync while typing, without requiring a save).
- `stepsParser.ts` — parses step files (`@given`/`@when`/`@then`/`@step` decorated functions) into `StepFileStep`s.
- `stepMappings.ts` — matches feature file step lines against parsed step definitions using a simplified regex (`{foo}` → `{.*}`); does not support typed/cfparse/regex parameter styles. This is what backs "Go to Step Definition" / "Find All Step References".
- `junitParser.ts` — parses behave's JUnit XML run output into test results.
- `testFile.ts` — the `TestFile`/`Scenario`/`BehaveTestData` model backing the VS Code test tree.

### Running/debugging (`src/runners/`)

- `runOrDebug.ts` → dispatches to `behaveRun.ts` or `behaveDebug.ts`.
- `testRunHandler.ts` — the `vscode.TestRunRequest` handler; builds an optimised `-i` regex from the selected test tree nodes so multiple selected features/scenarios run in as few `behave` invocations as possible (unless `runParallel` is set, which spawns one `behave` instance per feature). Debug mode dynamically builds a debug launch config (equivalent to a hand-written `launch.json`) so the `ms-python.python` extension does the actual debugging.
- Results always come from behave's JUnit XML output (`--junit`), watched by `watchers/junitWatcher.ts`, never from parsing live stdout — this is why e.g. `stdout_capture=False`/print statements don't show in the output window (JUnit mode redirects all stdout/stderr into the XML report regardless of capture settings).

### Configuration (`src/configuration.ts`, `src/settings.ts`)

`config` is a singleton (`ExtensionConfiguration.configuration`) implementing `Configuration`, holding a `Logger`, per-workspace `WorkspaceSettings`, and global `WindowSettings`. Settings are resource-scoped (`behave-vsc.*` in `package.json` `contributes.configuration`), so different workspace folders in a multi-root workspace can have different settings — never assume a single global config applies everywhere.

### Watchers (`src/watchers/`)

- `workspaceWatcher.ts` — filesystem watchers per workspace (feature/step file changes trigger reparse).
- `junitWatcher.ts` — watches the extension's temp JUnit output folder (recreated each extension start) and feeds results back into the test run.

### Editor integration (`src/handlers/`)

`autoCompleteProvider.ts` (step autocomplete), `formatFeatureProvider.ts` (feature file formatting, e.g. Ctrl+K Ctrl+F), `semHighlightProvider.ts` (semantic highlighting for step parameters and missing-step detection), `gotoStepHandler.ts` / `findStepReferencesHandler.ts` / `stepReferencesView.ts` (two-way step navigation, backed by `stepMappings.ts`). Gherkin base syntax highlighting comes from `gherkin.grammar.json` (TextMate grammar), not from `semHighlightProvider.ts`.

## Development guidelines (from CONTRIBUTING.md — condensed)

These are the project's own hard constraints, not generic advice — follow them when editing `src/`:

- **No new npm dependencies.** Keep the extension lightweight; reuse what's already in `node_modules` if possible.
- **No dependency on extensions other than `ms-python.python`.**
- **Always assume multi-root workspaces.** Settings, output channels, and watchers are all per-workspace-folder; workspace folders can be added/removed at runtime.
- **Cross-platform correctness matters.** Use `getUriMatchString()`/`urisMatch()` for URI equality (never `uri.path`/`uri.fsPath` directly for comparisons); use `uri.path` internally and `uri.fsPath` only for actual file operations; use `vscode.Uri.joinPath` instead of `path.join` (outside integration tests); use `relativePattern` for file searches; be mindful of Windows path length/command-line length limits.
- **The extension must never produce a different result than running the equivalent `behave` command manually.** Don't intercept/modify behave's own behaviour to "fix" it — that's a bug, not a feature.
- **Error handling convention**: prefer `throw "message"` or `throw new WkspError(...)` everywhere except top-level entry points (`activate`, `deactivate`, `*Handler`/`onDid*` callbacks, unawaited async/background functions), which must wrap their body in `try/catch` and call `config.showError` — errors should surface exactly once, at the top of the call stack.
- **Logging convention**: use `config.logger.logInfo(msg, wkspUri[, run])` for user-facing info (goes to the workspace's output channel, and to the test run output if `run` is passed); use `showWarn`/`showError` for warnings/errors (never call the logger directly for those — they self-log); use `diagLog()` for contributor/diagnostic-only output (visible when `behave-vsc.xRay` is enabled).
- Watch for race conditions given concurrent multi-root + `runParallel` execution.
