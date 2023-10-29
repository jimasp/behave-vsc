import os 

from behave import *

@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass

@when("envvar {var} is set to '{value}'")
def step_impl(context, var, value):
    assert os.environ[var] == value

@when("envvar {var} is set to either '{value1}' or '{value2}'")
def step_impl(context, var, value1, value2):
    assert os.environ[var] == value1 or os.environ[var] == value2 
    
@when("envvar {var} is set to '{value}' or not set")
def step_impl(context, var, value):
    assert os.environ.get(var) == value or os.environ.get(var, None) is None     

@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
