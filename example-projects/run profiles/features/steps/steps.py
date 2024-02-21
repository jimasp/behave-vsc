import os 

from behave import *

@given("we have run profiles")
def installed(context):
    pass
   
@then("envvars are as expected")
def profile_vs_envvar_check(context):
    profile = os.environ.get("profile")

    assert os.environ.get("var3") == "ENV-var3"
    
    def get_expected_env_vars(value):
        return {
            None: {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None
            },
            "stage2_profile":  {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": "stage2",
                "qu'oted\"env": None
            },
            "tag1_profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag1_vars_profile": {
                "var1": "TAG1-var1",
                "var2": "TAG1-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag2_vars_profile": {
                "var1": "TAG2-var1",
                "var2": "TAG2-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag1or2_vars_profile": {
                "var1": "TAG1_OR_2-var1",
                "var2": "TAG1_OR_2-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None       
            },
            "qu'oted\"tag_profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None
            },
            "qu'oted\"env_profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": "v'al\"ue"
            }
               
        }.get(value, "default")        

    assert get_expected_env_vars(profile) == {
        "var1": os.environ.get("var1"),
        "var2": os.environ.get("var2"),
        "BEHAVE_STAGE": os.environ.get("BEHAVE_STAGE"),
        "qu'oted\"env": os.environ.get("qu'oted\"env")
    }
    

@then("tags are as expected")
def profile_vs_tags_check(context):
    profile = os.environ.get("profile")
    tags = context._config.tags.ands
    
    def get_expected_tags(value):
        return {
            None: [],
            "stage2_profile": [],
            "tag1_profile": [["tag1"]],
            "tag1_vars_profile": [["tag1"]],
            "tag2_vars_profile": [["tag2"]],
            "tag1or2_vars_profile": [["tag1", "tag2"]],
            "qu'oted\"env_profile": [],
            "qu'oted\"tag_profile": [["qu'oted\"tag"]],
        }.get(value, "default")    
       
    assert tags == get_expected_tags(profile)


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
