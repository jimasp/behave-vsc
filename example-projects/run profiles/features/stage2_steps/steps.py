import os 
from behave import *

# import shared steps frm features/steps/steps.py
import features.steps.steps

# create specific step to replace features/steps/stage_steps.py
@when("envvar BEHAVE_STAGE is set as expected")
def step_impl(context):
    assert os.environ.get("BEHAVE_STAGE") == "stage2"
    assert context.bs_set == "set by stage2_environment.py"    
    
