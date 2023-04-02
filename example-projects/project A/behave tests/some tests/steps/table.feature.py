# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
from behave import given, when, then

class UserDept:
    user = ""
    dept = ""

    def __init__(self, user, dept):
        self.user = user
        self.dept = dept


@given("we add a set of users")
def spec_users(context):
    context.userDepts = [UserDept]
    for row in context.table:
        context.userDepts.append(UserDept(row["user"], row["dept"]))

@when("we do nothing")
def do_nothing(context):
    pass

@then('we will find {count} people in "{dept}"')
def find_count(context, count, dept):
    assert int(count) == sum(1 for ud in context.userDepts if ud.dept == dept)


@then('we will find 1 person in "{dept}"')
def find_one(context, dept):
    assert sum(1 for ud in context.userDepts if ud.dept == dept) == 1



