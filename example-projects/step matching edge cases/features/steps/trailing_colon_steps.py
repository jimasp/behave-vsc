# ruff: noqa
from behave import *


@given("a step definition that itself ends with a colon:")
def step_trailing_colon(context):
    pass
