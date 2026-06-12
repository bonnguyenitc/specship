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


class TestSlugifyMaxLength(unittest.TestCase):     # TASK-002
    def test_ac1_no_max_unchanged(self):           # TASK-002 AC1
        self.assertEqual(slugify("Hello World"), "hello-world")

    def test_ac2_truncates_to_max(self):           # TASK-002 AC2
        self.assertEqual(slugify("The Quick Brown Fox", max_length=9), "the-quick")

    def test_ac3_no_trailing_hyphen(self):         # TASK-002 AC3
        self.assertEqual(slugify("Hello World", max_length=6), "hello")

    def test_ac4_shorter_than_max(self):           # TASK-002 AC4
        self.assertEqual(slugify("Café", max_length=10), "cafe")


class TestSlugifySeparator(unittest.TestCase):     # TASK-003
    def test_ac1_custom_separator(self):           # TASK-003 AC1
        self.assertEqual(slugify("Hello World", separator="_"), "hello_world")

    def test_ac2_collapses_runs(self):             # TASK-003 AC2
        self.assertEqual(slugify("  Multiple   Spaces  ", separator="_"), "multiple_spaces")

    def test_ac3_max_length_strips_separator(self):  # TASK-003 AC3
        self.assertEqual(slugify("The Quick Brown Fox", max_length=9, separator="_"), "the_quick")

    def test_ac4_default_unchanged(self):          # TASK-003 AC4
        self.assertEqual(slugify("Hello World"), "hello-world")


if __name__ == "__main__":
    unittest.main()
