# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=unused-argument
import time
import os
from behave import given, when, then  # pylint: disable=no-name-in-module


@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    some_var = os.environ.get("some_var")
    some_var2 = os.environ.get("some_var2")
    assert some_var == "some value"
    assert some_var2 == "quo'ted"


@when("we implement a {successful_or_failing} test")
@when("\"we\" implement a [{successful_or_failing}] test")
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"



@when("we implement a test that is slow")
def step_slow(context):
    time.sleep(1.5)
    assert 1 == 1


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
