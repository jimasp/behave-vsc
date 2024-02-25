Feature: Mixed results

   Scenario: test success
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 301

   Scenario: test failure
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 200

   @skip
   Scenario: test skipped
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 301
