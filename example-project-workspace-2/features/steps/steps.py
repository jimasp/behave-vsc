# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=unused-argument
import time
from behave import *

from features.grouped.steps import outline_feature_steps, table_feature_steps


@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass


@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@when("we implement a test that is slow")
def step_slow(context):
    time.sleep(3)
    assert 1 == 1


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
