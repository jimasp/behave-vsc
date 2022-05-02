Feature: With a hook-error

    @raise_error_in_before_scenario
    Scenario: create a before hook-error
        Given we have behave installed

    @normal_skip
    Scenario: normal skip
        Given we have behave installed

    @normal_skip @raise_error_in_before_scenario
    Scenario: skip a before hook-error
        Given we have behave installed        

    @raise_error_in_before_scenario
    Scenario: create a before hook-error again
        Given we have behave installed

    @normal_skip
    Scenario: another normal skip
        Given we have behave installed                

    @raise_error_in_after_scenario
    Scenario: create an after hook-error
        Given we have behave installed

    @normal_skip @raise_error_in_after_scenario
    Scenario: skip an after hook-error
        Given we have behave installed        

    @raise_error_in_after_scenario
    Scenario: create an after hook-error again
        Given we have behave installed        