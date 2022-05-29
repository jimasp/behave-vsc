# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
import os
import time
from behave import *


@given("we need envvars")
def envvars(context):
    some_var = os.getenv("some_var")
    some_var2 = os.getenv("some_var2")
    space_var = os.getenv("space_var")
    USER = os.getenv("USER")
    assert some_var == 'double qu"oted'
    assert some_var2 == "single qu'oted"
    assert space_var == " "
    assert USER == "bob-163487"
    