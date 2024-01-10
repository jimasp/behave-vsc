# Unit Tests

The `vscode` object used across the codebase requires a vscode host instance.
So although these are unit tests, we must still fire up a shell vscode host instance to run them in.
(We don't need a workspace in the instance.)
