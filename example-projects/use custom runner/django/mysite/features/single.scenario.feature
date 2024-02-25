Feature: Single scenario

   @auth
   Scenario: /admin returns 301
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 301