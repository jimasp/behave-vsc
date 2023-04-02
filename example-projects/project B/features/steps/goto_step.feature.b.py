import behave

@behave.given("@behave style step")
def b_given(context):
    pass

@behave.step(
    'wrapped @behave step blaha "{a}" "{b}" blahd blahe blahf blahg blahh blahi blahj blahk '
    'blahl blahm blahn blaho blahp blahq blahr blahs blaht blahu blahv '
    'blahw blahx blahy blahz'
)
def b_step(context, a, b):
    assert a == "double"
    assert b == "quoted"
