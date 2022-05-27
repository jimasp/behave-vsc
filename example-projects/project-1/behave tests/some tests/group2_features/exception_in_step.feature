Feature: raise exception in step

   Scenario: scenario that fails due to step exception
      Given we have behave installed
      When we raise an index out of range exception
