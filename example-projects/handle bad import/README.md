# bad import folder project

- This project tests bad import handling. (While this will not break the extension directly, it will affect behave and the extension needs to handle behave's response, i.e. that there are no junit files produced.)
- After running the tests, the extension should show that the tests did not run and clicking on the test error information in the feature file should show a message that indicates that behave output should be checked.
