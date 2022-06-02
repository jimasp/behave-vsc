# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
from behave import *

@when("we raise an index out of range exception")
def step_impl(context):
    value = ["value"]
    value = value[5]
