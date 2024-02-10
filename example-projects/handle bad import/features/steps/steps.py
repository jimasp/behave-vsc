# ruff: noqa
from behave import *

@given("we have a bad import")
def step_inst(context):
    pass


@when("we run any test")
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("we can handle behave failing")
def step_res(context):
    assert 1 == 1
