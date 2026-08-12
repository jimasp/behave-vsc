# ruff: noqa
from behave import *


@step(
    'a step whose literal ends with a quoted parameter "{value}"'
)
def step_quoted_param_at_end(context, value):
    pass
