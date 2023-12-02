import os 

@when("envvar BEHAVE_STAGE is set as expected")
def behave_stage_is_not_set(context):
    assert os.environ.get("BEHAVE_STAGE", None) is None
    try:
        assert context.bs_set is None
    except AttributeError as e:
        assert str(e) == "'Context' object has no attribute 'bs_set'"