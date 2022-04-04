Feature: With a hook-error

    @raise_error_in_before_scenario
    Scenario: create a before hook-error
        Given we have behave installed

    @normal_skip
    Scenario: skip in middle
        Given we have behave installed

    @normal_skip @raise_error_in_before_scenario
    Scenario: skip before hook-error
        Given we have behave installed        

    @raise_error_in_before_scenario
    Scenario: before_hook_error again
        Given we have behave installed        

    @raise_error_in_after_scenario
    Scenario: create a after hook-error
        Given we have behave installed

    @normal_skip
    Scenario: another skip
        Given we have behave installed

    @normal_skip @raise_error_in_after_scenario
    Scenario: skip after hook-error
        Given we have behave installed        

    @raise_error_in_after_scenario
    Scenario: after_hook_error again
        Given we have behave installed        