import unittest

from src.slugify import slugify


class TestSlugify(unittest.TestCase):
    def test_ac1_basic(self):              # AC1
        self.assertEqual(slugify("Hello World"), "hello-world")

    def test_ac2_multiple_spaces(self):    # AC2
        self.assertEqual(slugify("  Multiple   Spaces  "), "multiple-spaces")

    def test_ac3_accents(self):            # AC3
        self.assertEqual(slugify("Café Crème"), "cafe-creme")

    def test_ac4_symbols(self):            # AC4
        self.assertEqual(slugify("C++ & Rust!"), "c-rust")

    def test_ac5_empty(self):              # AC5
        self.assertEqual(slugify(""), "")


if __name__ == "__main__":
    unittest.main()
