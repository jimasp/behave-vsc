Feature: With a hook-error

    @raise_error_in_before_scenario
    Scenario: create a before hook-error
        Given we have behave installed

    @skip
    Scenario: scenario in with a hook-error feature that will be skipped
        Given we have behave installed

    @skip @raise_error_in_before_scenario
    Scenario: skip a before hook-error
        Given we have behave installed        

    @raise_error_in_before_scenario
    Scenario: create a before hook-error again
        Given we have behave installed

    @skip
    Scenario: another scenario in with a hook-error feature that will be skipped
        Given we have behave installed                

    @raise_error_in_after_scenario
    Scenario: create an after hook-error
        Given we have behave installed

    @skip @raise_error_in_after_scenario
    Scenario: skip an after hook-error
        Given we have behave installed        

    @raise_error_in_after_scenario
    Scenario: create an after hook-error again
        Given we have behave installed        