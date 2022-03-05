# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring

def before_scenario(context, scenario): #pylint: disable=unused-argument
    if "normal_skip" in scenario.effective_tags:
        scenario.skip("Marked with @normal_skip")
