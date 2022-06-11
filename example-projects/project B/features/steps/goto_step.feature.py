# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
from behave import *

@given("given step")
def given_step(context):
    pass

@given("and step")
def and_step(context):
    pass

@when("when step")
def when_step(context):
    pass    

@then("then step")
def then_step(context):
    pass

@then("but step")
def but_step(context):
    pass

@step("stepA")
def step_a(context):
    pass

@step("stepB")
def step_b(context):
    pass

@step("stepC")
def step_c(context):
    pass

@step("stepD")
def step_d(context):
    pass

@step("stepE")
def step_e(context):
    pass

@step("a simple step")
def simple_step(context):
    pass

@step(u"a simple step with more text")
def simple_step_with_more_text(context):
    pass

@step("a CaSeD step")
def simple_step_with_more_text(context):
    pass

@step("{a} param step")
def param_step(context, a):
    assert a == "a"


@step("{a} param step with more text")
def param_step(context, a):
    assert a == "a"


@given("{a} two param {b} no1")
def two_param_step(context, a, b):
    assert a == "a"   
    assert b == "step"   


@given("{a} two param {b} no2")
def two_param_step_with_more_text(context, a, b):
    assert a == "a"   
    assert b == "step"   
        

@given('a step with {num:d}')
def step_with_typed_param(context, num:int):
    assert num == 1
    
    
@given('a step with "{num:d}"')
def step_with_typed_param2(context, num:int):
    assert num == 2
    
@given('a step with or without custom type{environment_py_custom_flag:flag_here} should be {expected_result}')
def step_with_named_param(context, environment_py_custom_flag:bool, expected_result:bool):
    assert environment_py_custom_flag == (expected_result == "True")

@given("yet another step")
def yet_another_step(context):
    pass

@given("'{a}' '{b}' step")
def a_single_quoted_step(context, a, b):
    assert a == "yet"
    assert b == "another"    


@given('"{a}" "{b}" step')
def a_double_quoted_step(context, a, b):
    assert a == "yet"
    assert b == "another"
    

@step(
    "wrapped step1 blaha {a} {b} blahd blahe blahf blahg blahh blahi blahj blahk " 
    "blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv " 
    "blahw blahx blahy blahz"
)
def wrapped_step1(context, a, b):
    assert a == "foo1"
    assert b == "bar1"


@step(
    "wrapped step2 blaha '{a}' '{b}' blahd blahe blahf blahg blahh blahi blahj blahk " \
    "blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv " \
    "blahw blahx blahy blahz"
)
def wrapped_step2(context, a, b):
    assert a == "foo2"
    assert b == "bar2"


@step(
    'wrapped step3 blaha "{a}" "{b}" blahd blahe blahf blahg blahh blahi blahj blahk '
    'blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv '
    'blahw blahx blahy blahz'
)

@step(
    'wrapped step4 blaha another one blahd blahe blahf blahg blahh blahi blahj blahk '
    'blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv '
    'blahw blahx blahy blahz'
)

def wrapped_step3(context, a, b):
    assert a == "foo3"
    assert b == "bar3"

