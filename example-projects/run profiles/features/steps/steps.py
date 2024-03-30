import os 

from behave import *

@given("we have run profiles")
def installed(context):
    pass


   
@then("envvars are as expected")
def profile_vs_envvar_check(context):
    profile = os.environ.get("profile")
    if not profile:
        profile = "default"     
   
    def get_expected_env_vars(value):
        return {
            "default": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None
            },
            "args profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None
            },     
            "no args profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None
            },                          
            "qu'oted\"tag and qu'oted\"env profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": "v'al\"ue"
            },            
            "stage2 profile":  {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": "stage2",
                "qu'oted\"env": None
            },
            "tag1 profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag1 vars profile": {
                "var1": "TAG1-var1",
                "var2": "TAG1-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag2 vars profile": {
                "var1": "TAG2-var1",
                "var2": "TAG2-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None         
            },
            "tag1ortag2 vars profile": {
                "var1": "TAG1_OR_2-var1",
                "var2": "TAG1_OR_2-var2",
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None       
            },
            "tag1andtag2 profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None       
            },         
           "tag1ortag2andtag3 profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None       
            },     
           "nottag1andnottag2 profile": {
                "var1": "ENV-var1",
                "var2": None,
                "BEHAVE_STAGE": None,
                "qu'oted\"env": None       
            }  
        }.get(value)        
        

    assert os.environ.get("var3") == "ENV-var3"    
    expected_env_vars = get_expected_env_vars(profile)
    assert expected_env_vars

    assert expected_env_vars == {
        "var1": os.environ.get("var1"),
        "var2": os.environ.get("var2"),
        "BEHAVE_STAGE": os.environ.get("BEHAVE_STAGE"),
        "qu'oted\"env": os.environ.get("qu'oted\"env")
    }
    
    
@then("args are as expected")
def profile_vs_args_check(context):
    profile = os.environ.get("profile")
    if not profile:
        profile = "default"  

    args = context.config.userdata
    
    def get_expected_args(value):
        return {
            "default": {"foo": "bar", "fizz": "buzz"},
            "qu'oted\"tag and qu'oted\"env profile": {"foo": "bar", "fizz": "buzz"},
            "args profile": {"d1":"val1", "d2":"val2"},
            "no args profile": {},
            "stage2 profile": {"foo": "bar", "fizz": "buzz"},
            "tag1 profile": {"foo": "bar", "fizz": "buzz"},
            "tag1 vars profile": {"foo": "bar", "fizz": "buzz"},
            "tag2 vars profile": {"foo": "bar", "fizz": "buzz"},
            "tag1ortag2 vars profile": {"foo": "bar", "fizz": "buzz"},
            "tag1andtag2 profile": {"foo": "bar", "fizz": "buzz"},
            "tag1ortag2andtag3 profile": {"foo": "bar", "fizz": "buzz"},     
            "nottag1andnottag2 profile": {"foo": "bar", "fizz": "buzz"},
            "qu'oted\"tag and env profile": {"foo": "bar", "fizz": "buzz"},
        }.get(value)    
        
    expected_args = get_expected_args(profile)  
    assert expected_args or expected_args == {}
    
    assert args == expected_args
    

@then("tags are as expected")
def profile_vs_tags_check(context):
    profile = os.environ.get("profile")
    if not profile:
        profile = "default"  
    
    # ands = while this is called "ands" it could be an OR or an AND or both combined
    # an OR is [[tag1, tag2]],
    # an AND is [[tag1], [tag2]]
    tags = context.config.tags.ands
    
    def get_expected_tags(value):
        return {
            "default": [],
            "qu'oted\"tag and qu'oted\"env profile": [["qu'oted\"tag"]],
            "args profile": [],
            "no args profile": [],            
            "stage2 profile": [],
            "tag1 profile": [["tag1"]],
            "tag1 vars profile": [["tag1"]],
            "tag2 vars profile": [["tag2"]],
            "tag1ortag2 vars profile": [["tag1", "tag2"]],
            "tag1andtag2 profile": [["tag1"], ["tag2"]],
            "tag1ortag2andtag3 profile": [["tag1", "tag2"], ["tag3"]],            
            "nottag1andnottag2 profile": [["-tag1"], ["-tag2"]],
            "qu'oted\"tag and env profile": [["qu'oted\"tag"]],
        }.get(value)    
        
    expected_tags = get_expected_tags(profile)  
    assert expected_tags or expected_tags == []
    
    assert tags == expected_tags


@given("we have behave installed")
def installed(context):
    pass

@when("we implement a {successful_or_failing} test")
def we_impl(context, successful_or_failing):
    assert successful_or_failing == "successful"


@then("we will see the result")
def see_result(context):
    assert 1 == 1
