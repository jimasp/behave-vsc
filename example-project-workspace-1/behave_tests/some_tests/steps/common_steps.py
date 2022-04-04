# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
import os
import time
from behave import *


@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass


@given("we need envvars")
def envvars(context):
    some_var = os.environ.get("some_var")
    some_var2 = os.environ.get("some_var2")
    empty_var = os.environ.get("empty_var")
    space_var = os.environ.get("space_var")
    assert some_var == "double qu\"oted"
    assert some_var2 == "single qu'oted"
    assert empty_var == ""
    assert space_var == " "
    

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
