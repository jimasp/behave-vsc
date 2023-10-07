# ruff: noqa
import parse
from behave import model, register_type


@parse.with_pattern(r"(| flag here)")
def parse_flag(text:str):
    return text.strip().lower() == "flag here"

register_type(flag_here=parse_flag)


def before_scenario(context, scenario:model.Scenario):
    if "skip" in scenario.effective_tags:
        scenario.skip("Marked with @skip")
        return
    if "raise_error_in_before_scenario" in scenario.effective_tags:
        raise Exception("error in before_scenario hook")

def after_scenario(context, scenario:model.Scenario): 
    if "skip" in scenario.effective_tags:
        scenario.skip("Marked with @skip")
        return
    if "raise_error_in_after_scenario" in scenario.effective_tags:
        raise Exception("error in after_scenario hook")
