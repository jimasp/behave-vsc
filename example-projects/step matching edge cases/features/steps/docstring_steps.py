# ruff: noqa
from behave import *


@given("a step with a docstring argument")
def step_with_docstring(context):
    assert context.text is not None
