# Unit Tests

The `vscode` object used across the codebase requires a vscode host instance.
So although these are unit tests, we must still fire up a shell vscode host instance to run them in.
(We don't need a workspace in the instance.)

## Guidelines

- 1. Can you cover your test case with an integration test as well (or instead), e.g. using assertLogExists in an integration test?

- 2. Unit tests should only test the public API of a module, this avoids fragile tests that are coupled to implementation details.

- 3. Avoid mocking where possible.
