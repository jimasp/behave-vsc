# ruff: noqa
from behave import model


def before_scenario(context, scenario:model.Scenario): 
    context.bs_set = "set by stage_environment.py"
    if "skip" in scenario.effective_tags:
        scenario.skip("Marked with @skip")
        return

def after_scenario(context, scenario:model.Scenario): 
    if "skip" in scenario.effective_tags:
        scenario.skip("Marked with @skip")
        return
