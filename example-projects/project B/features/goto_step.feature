Feature: Go to Step def tests

Scenario: step types 1
    Given given step
    And and step
    When when step
    Then then step
    But but step

Scenario: step types 2
    Given given step
    And given step
    But given step
    When when step
    And when step
    But when step
    Then then step
    And then step
    But then step

Scenario: simple step
    Given a SIMPLE step

Scenario: simple step with more text
    Given a simple step with more text

Scenario: a cased step
    Given a CASed StEP

Scenario: a cased step2
    Given a cased STEP

Scenario: param step
    Given a param step

Scenario: param step with more text
    Given a param step with more text

Scenario: two param step no1
    Given a two param step no1

Scenario: two param step no2
    Given a two param step no2
 
Scenario: step with param
    Given a step with 1

Scenario: step with param2
    Given a step with "2"

Scenario: step without custom flag type
    Given a step with or without custom type should be False

Scenario: step with custom flag type present
    Given a step with or without custom type FLAG HERE should be True

Scenario: yet another step
    Given yet another step

Scenario: "yet" "another" step double quoted
    Given "yet" "another" step

Scenario: 'yet' 'another' step single quoted
    Given 'yet' 'another' step    

Scenario: wrapped step 1
    Given wrapped step1 blaha unquoted params blahd blahe blahf blahg blahh blahi blahj blahk blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv blahw blahx blahy blahz

Scenario: wrapped step 2
    Given wrapped step2 blaha 'single' 'quoted' blahd blahe blahf blahg blahh blahi blahj blahk blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv blahw blahx blahy blahz

Scenario: wrapped step 3
    Given wrapped step3 blaha "double" "quoted" blahd blahe blahf blahg blahh blahi blahj blahk blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv blahw blahx blahy blahz

Scenario: wrapped step 4
    Given wrapped step4 blaha no params blahd blahe blahf blahg blahh blahi blahj blahk blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv blahw blahx blahy blahz
