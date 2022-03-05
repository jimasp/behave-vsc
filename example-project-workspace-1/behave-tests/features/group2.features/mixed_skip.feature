Feature: Mixed skip scenarios

   @normal_skip
   Scenario: normal skip
      Given we have behave installed
      When we implement a failing test
      Then we will see the result     

   Scenario: don't skip and success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @fast-skip-me
   Scenario: fast skip a successful test
      Given we have behave installed
      When we implement a successful test
      Then we will see the result     

   Scenario: don't skip and fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result    

   @fast-skip-me-too
   Scenario: fast skip a failing test
      Given we have behave installed
      When we implement a failing test
      Then we will see the result     

