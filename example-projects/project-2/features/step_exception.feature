Feature: Bad step

   Scenario: bad step should show failure message
      Given we have behave installed
      When we have a step that raises an exception
      Then we will see the result



