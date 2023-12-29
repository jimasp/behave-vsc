# while not referenced here, we need to import them so behave can find steps in the other folder e.g. "Given I put "xxx" in a blender".
# (this isn't best practice for this setup, but we need to test it works)
from features.grouped.steps import outline_feature_steps
from features.grouped2.g2_steps import table_feature_steps
