Feature: Folder feature

   Scenario: test success
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 301