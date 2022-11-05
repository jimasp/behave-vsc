Feature: With background

    Background: (setup stuff before each scenario of this feature but after the before hooks)
        Given we start with 2

    Scenario: add
        Given we add 2
        When we add 3
        Then the result should be 7

    Scenario: multiply
        Given we multiply by 2
        When we multiply by 3
        Then the result should be 12
