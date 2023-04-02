# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=unused-argument
import time

from behave import *

# while not referenced here, we need to import them so behave can find steps in the other folder e.g. "Given I put "xxx" in a blender".
# (this isn't best practice for this setup, but we need to test it works)
from features.grouped.steps import outline_feature_steps, table_feature_steps


@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass

@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl1(context, successful_or_failing):
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
