Feature: Bad import: scenarios should fail (unless cancelled)

   Scenario: fail 1
      Given we have a bad import
      When we run any test
      Then we can handle behave failing

   Scenario: fail 2
      Given we have a bad import
      When we run any test
      Then we can handle behave failing

   Scenario: fail 3
      Given we have a bad import
      When we run any test
      Then we can handle behave failing
