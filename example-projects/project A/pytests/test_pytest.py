# ruff: noqa
import pytest

# standard pytest tests added to show
# they don't interfere with behave tests

def test_upper():
    assert "foo".upper() == "FOO"

def test_isupper():
    assert "FOO".isupper()
    assert not "Foo".isupper()

def test_split():
    txt = "hello world"
    assert txt.split() == ["hello", "world"]
    # s.split fails if not a string
    with pytest.raises(TypeError):
        txt.split(2)

def test_fail():
    assert 1 == 2