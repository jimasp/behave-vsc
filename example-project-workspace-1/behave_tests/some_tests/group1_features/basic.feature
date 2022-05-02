Feature: Basic

   Scenario: run a successful test
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: run a slow test for async testing
      Given we have behave installed
      When we implement a test that takes 4 seconds
      Then we will see the result

   Scenario: run another slow test for async testing
      Given we have behave installed
      When we implement a test that takes 1.5 seconds
      Then we will see the result

   Scenario: run a failing test
      Given we have behave installed
      When we implement a failing test
      Then we will see the result     

   Scenario: run another successful test
      Given we have behave installed
      When we implement a successful test
      Then we will see the result      

   Scenario: run a test with a missing steps
      Given we have behave installed
      When we have a missing step
      Then we will see the result         

   @normal_skip
   Scenario: run a skipped test
      Given we have behave installed


