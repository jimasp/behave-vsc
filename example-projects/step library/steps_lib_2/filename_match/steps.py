from behave import *

@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
