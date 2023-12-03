# ruff: noqa
import os
from behave import given

@given("we need envvars")
def envvars(context):
    # check that a standard system envvar is present
    osev = os.getenv("COMPUTERNAME") if os.name == "nt" else os.getenv("HOME")
    assert osev

    # check behave-vsc.env setting worked
    some_var = os.getenv("some_var")
    some_var2 = os.getenv("some_var2")
    space_var = os.getenv("space_var")
    USERNAME = os.getenv("USERNAME")
    assert some_var == 'double qu"oted'
    assert some_var2 == "single qu'oted"
    assert space_var == " "
    # check that the standard system env var "USERNAME" was overridden successfully by env
    assert USERNAME == "bob-163487" 
    



