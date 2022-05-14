# pylint: disable=missing-module-docstring
# pylint: disable=missing-function-docstring
# pylint: disable=missing-class-docstring
import unittest

# standard unit tests added to show
# they don't interfere with behave tests

class TestStringMethods(unittest.TestCase):
    def test_upper(self):
        self.assertEqual("foo".upper(), "FOO")

    def test_isupper(self):
        self.assertTrue("FOO".isupper())
        self.assertFalse("Foo".isupper())

    def test_split(self):
        txt = "hello world"
        self.assertEqual(txt.split(), ["hello", "world"])
        # s.split fails if not a string
        with self.assertRaises(TypeError):
            txt.split(2)

    def test_fail(self):
        self.assertTrue(1 == 2)
