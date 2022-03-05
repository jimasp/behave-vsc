# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
from behave import given,when,then # pylint: disable=no-name-in-module

@given('I put "{thing}" in a blender')
def step_given_put_thing_into_blender(context, thing):
    context.blender = Blender()
    context.blender.add(thing)


@when("I switch the blender on")
def step_when_switch_blender_on(context):
    context.blender.switch_on()


@then('it should transform into "{other_thing}"')
def step_then_should_transform_into(context, other_thing):
    assert context.blender.result == other_thing


# some code elsewhere that we are testing
class Blender(object):
    TRANSFORMATION_MAP = {
        "apples": "apple juice",
        "iPhone": "toxic waste",
        "Galaxy Nexus": "toxic waste",
        "Red Tree Frog": "mush",
    }

    def __init__(self):
        self.thing = None
        self.result = None

    @classmethod
    def select_result_for(cls, thing):
        return cls.TRANSFORMATION_MAP.get(thing, "DIRT")

    def add(self, thing):
        self.thing = thing

    def switch_on(self):
        self.result = self.select_result_for(self.thing)
