Feature: Folder feature

   # for this to be show as passed in test explorer UI, it must be run 
   # with the "behave-django runner profile - wait for results" run profile
   # (you can set this as the default profile for the project via the test explorer UI)
   Scenario: test success
      Given manage.py exists in the working directory
      When I go to /admin
      Then the status code is 301