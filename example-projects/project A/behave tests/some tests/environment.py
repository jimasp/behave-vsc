# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring

from behave import model
import os

def before_scenario(context, scenario:model.Scenario): #pylint: disable=unused-argument
    if "normal_skip" in scenario.effective_tags:        
        scenario.skip("Marked with @normal_skip")
