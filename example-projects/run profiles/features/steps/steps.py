import os 

from behave import *

@given("we have behave installed")
def installed(context):
    pass
    
@when("envvar {var} is set to '{value}'")
def envvar(context, var, value):
    assert os.environ[var] == value

@when("envvar {var} is set to one of '{csv}'")
def envvar_one_of(context, var, csv):
    assert os.environ[var] in [v.strip() for v in csv.split(",")]
    
@when("envvar {var} is either not set or set to one of '{csv}'")
def envvar_none_or_one_of(context, var, csv):
    val = os.environ.get(var, None)   
    assert val is None or (val in [v.strip() for v in csv.split(",")])

@when("we implement a {successful_or_failing} test")
def we_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("envvar var1 vs var2 ties up")
def envvar_ties_up(context):    
    var1 = os.environ.get("var1", None)
    var2 = os.environ.get("var2", None)
    if var1 == "TAG1-var1":
        assert var2 is None or var2 == "TAG1-var2"
    if var1 == "TAG2-var1":
        assert var2 is None or var2 == "TAG2-var2"        
    if var1 == "TAG1_OR_2-var1":
        assert var2 is None or var2 in ["TAG1_OR_2-var2"]


@then("we will see the result")
def see_result(context):
    assert 1 == 1
