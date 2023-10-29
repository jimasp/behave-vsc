Feature: Tags and Vars

   @tag1
   Scenario: @tag1 - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag1
   Scenario: @tag1 - fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result

   @skip @tag1
   Scenario: @tag1 @skip - skip always
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag1
   Scenario: @tag1 - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to either 'TAG1-1' or 'OVR-1'
      And envvar var2 is set to 'TAG1-2' or not set
      And envvar var3 is set to 'OVR-3'
      Then we will see the result   

  @tag2
   Scenario: @tag2 - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag2
   Scenario: @tag2 - fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result

   @skip @tag2
   Scenario: @tag2 @skip - skip always
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag2
   Scenario: @tag2 - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to either 'TAG2-1' or 'OVR-1'
      And envvar var2 is set to 'TAG2-2' or not set
      And envvar var3 is set to 'OVR-3'
      Then we will see the result   
 
   Scenario: untagged - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: untagged - fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result

   @skip
   Scenario: untagged - @skip - skip always
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: untagged - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to 'OVR-1'
      And envvar var3 is set to 'OVR-3'
      Then we will see the result   



