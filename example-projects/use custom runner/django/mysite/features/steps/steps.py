import os
from behave import *


@given("manage.py exists in the working directory")
def step_impl(context):
    exists = os.path.isfile('./manage.py')
    assert exists is True
    

@when("I go to /admin")
def step_impl(context):
    context.response = context.test.client.get("/admin")


@then("the status code is {status:d}")
def step_impl(context, status):
    print(context.response.status_code)
    assert context.response.status_code == status
    

