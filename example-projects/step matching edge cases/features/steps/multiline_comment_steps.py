# ruff: noqa
from behave import *


@given(
    "a multiline decorated step with a trailing comment"
)  # to be deprecated
def step_multiline_comment(context):
    pass


@given("a second step defined after the commented decorator")
def step_after_commented_decorator(context):
    pass
