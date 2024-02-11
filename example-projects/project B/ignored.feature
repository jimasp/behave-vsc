Feature: Should be ignored (root feature that is not in behave.ini paths)

   Scenario: run a test
      Given we have behave installed
      When we implement a failing test
      Then we will see the result
