# ruff: noqa
from behave import *


@step(
    'a step built from two string literals '
    "with different quote characters"
)
def step_mixed_quotes(context):
    pass
