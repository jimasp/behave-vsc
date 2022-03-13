Feature: With a hook-error

    @raise_before_hook_error
    Scenario: create a before hook-error
        Given we have behave installed

    @normal_skip
    Scenario: skip in middle
        Given we have behave installed

    @normal_skip @raise_before_hook_error
    Scenario: skip before hook-error
        Given we have behave installed        

    @raise_before_hook_error
    Scenario: before_hook_error again
        Given we have behave installed        

    @raise_after_hook_error
    Scenario: create a after hook-error
        Given we have behave installed

    @normal_skip
    Scenario: another skip
        Given we have behave installed

    @normal_skip @raise_after_hook_error
    Scenario: skip after hook-error
        Given we have behave installed        

    @raise_after_hook_error
    Scenario: after_hook_error again
        Given we have behave installed        