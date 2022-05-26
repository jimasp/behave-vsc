# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
# pylint: disable=unused-argument
from behave import *
import os

@given("we have an envarlist PATH override")
def step_inst(context):
    assert(os.getenv("HOME") == "bob")
    assert(os.getenv['PATH'] == 'path override')
    pass

