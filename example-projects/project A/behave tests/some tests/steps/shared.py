# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
import time
from behave import given, when, then


@given(u"we have behave installed")
@given(u"we have (behave) installed")
def step_inst(context):
    pass


@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"

    
@when("we have a step that raises a non-assertion exception")
def step_impl2(context):
    raise Exception("Testing a step exception")    


@when("we implement a test that takes {secs} seconds")
def step_slow(context, secs):
    time.sleep(float(secs))
    assert 1 == 1


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
