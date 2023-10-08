# ruff: noqa
from behave import *


@given('we start with {num:d}')
def start(context, num):
    context.res = num
    
@given('we add {num:d}')
@when('we add {num:d}')
def add(context, num):
    context.res = context.res + num
    
@given('we multiply by {num:d}')
@when('we multiply by {num:d}')
def multiply(context, num):
    context.res = context.res * num

@then('the result should be {num:d}')
def step_the_ninja_should(context, num):
    assert context.res == num

