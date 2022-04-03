# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring

from behave import model

def before_scenario(context, scenario:model.Scenario): #pylint: disable=unused-argument
    if "normal_skip" in scenario.effective_tags:
        scenario.skip("Marked with @normal_skip")
        return
    if "raise_error_in_before_scenario" in scenario.effective_tags:
        raise Exception("error in before_scenario hook")

def after_scenario(context, scenario:model.Scenario): #pylint: disable=unused-argument
    if "normal_skip" in scenario.effective_tags:
        scenario.skip("Marked with @normal_skip")
        return
    if "raise_error_in_after_scenario" in scenario.effective_tags:
        raise Exception("error in after_scenario hook")
