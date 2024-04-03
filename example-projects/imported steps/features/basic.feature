Feature: Basic

   Scenario: run a successful test using importedSteps
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: run a failing test using importedSteps
      Given we have behave installed
      When we implement a failing test
      Then we will see the result     

   @skip
   Scenario: run a skipped test using importedSteps
      Given we have another step

   # This should give us BLUE text below (step navigation enabled) because although "dist" is an 
   # excluded path, it is specifically included as a stepImport in settings.json
   # (step references count will also be checked by integration test)
   Scenario: step reference check for excluded path importedSteps
      Given we have an imported steplibrary in an excluded folder
