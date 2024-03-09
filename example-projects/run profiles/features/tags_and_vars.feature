Feature: Tags and Vars

   @tag1 @tag2 @tag3 @qu'oted"tag
   Scenario: all tags - success - check tags and envvars
      Given we have run profiles
      Then envvars are as expected
      And tags are as expected

   Scenario: untagged - success - check tags and envvars
      Given we have run profiles
      Then envvars are as expected
      And tags are as expected   

   Scenario: untagged - fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result

   @skip
   Scenario: untagged - @skip - skip
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag1 @tag2
   Scenario: @tag1 @tag2 - success - stage check
      Given we have behave installed
      When envvar BEHAVE_STAGE is set as expected  
      Then we will see the result

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
   Scenario: @tag1 @skip - skip
      Given we have behave installed
      When we implement a successful test
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
   Scenario: @tag2 @skip - skip
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   @tag1 @tag3
   Scenario: @tag1 @tag3 - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result     

   @tag2 @tag3
   Scenario: @tag2 @tag3 - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result   
 


