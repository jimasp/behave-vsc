Feature: Tags and Vars

   @tag1 @tag2
   Scenario: @tag1 or @tag2 - success - stage check
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

   @tag1
   Scenario: @tag1 - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to one of 'ENV-var1, TAG1-var1, TAG1_OR_2-var1'
      And envvar var2 is either not set or set to one of 'ENV-var2, TAG1-var2, TAG1_OR_2-var2'
      And envvar var3 is set to 'ENV-var3'
      Then envvar var1 vs var2 ties up

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

   @tag2
   Scenario: @tag2 - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to one of 'ENV-var1, TAG2-var1, TAG1_OR_2-var1'
      And envvar var2 is either not set or set to one of 'ENV-var2, TAG2-var2, TAG1_OR_2-var2'
      And envvar var3 is set to 'ENV-var3'
      Then envvar var1 vs var2 ties up
 
   Scenario: untagged - success
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: untagged - fail
      Given we have behave installed
      When we implement a failing test
      Then we will see the result

   @skip
   Scenario: untagged - @skip - skip
      Given we have behave installed
      When we implement a successful test
      Then we will see the result

   Scenario: untagged - success - envvar checks
      Given we have behave installed
      When envvar var1 is set to 'ENV-var1'
      And envvar var3 is set to 'ENV-var3'
      Then we will see the result   



