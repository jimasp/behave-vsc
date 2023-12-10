# Unit Tests

The `vscode` object requires a vscode instance.
So although these are (sort of) unit tests, we still need to fire up container instance to run them in.
We'll use the `unit test workspace` for that.
Do not add any `.feature` files to the `unit test workspace` folder, we do NOT want the extension to activate for the unit test workspace!
