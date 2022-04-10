# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring

import parse
from behave import model, register_type

@parse.with_pattern(r"(| flag here)")
def parse_flag(text:str):
    return text.strip().lower() == "flag here"

register_type(flag_here=parse_flag)


def before_scenario(context, scenario:model.Scenario): #pylint: disable=unused-argument
    if "normal_skip" in scenario.effective_tags:        
        scenario.skip("Marked with @normal_skip")
