Feature: Basic2

   Scenario: run a successful test
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: run a failing test
      Given we have behave installed
      When we implement a failing test
      Then we will see the result     

   @skip
   Scenario: run a skipped test
      Given we have behave installed
