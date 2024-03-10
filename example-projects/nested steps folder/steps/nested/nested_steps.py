from behave import *

@when("we implement a {successful_or_failing} test")
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("we will see the result")
def step_res(context):
    assert 1 == 1
