# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=unused-argument
from behave import *
import os

@given("we have an envarlist USER override")
def step_inst(context):
    assert(os.getenv("USER") == "bob-163487")


