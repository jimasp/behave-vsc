from behave import *

@given("we have behave installed")
@given("we have (behave) installed")
def step_inst(context):
    pass


@when("we implement a {successful_or_failing} test")
@when('"we" implement a [{successful_or_failing}] test')
def step_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"

@when("we read a relative file")
def step_read(context):
    with open("relative_file.txt", "r") as f:
        read_data = f.read()
        assert read_data == "some content"


@then("we will see the result")
@then("we will *see* the result")
def step_res(context):
    assert 1 == 1
