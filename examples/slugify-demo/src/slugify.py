import re
import unicodedata


def slugify(
    text: str,
    max_length: int | None = None,
    separator: str = "-",
    word_boundary: bool = False,
) -> str:
    # fold accents to ASCII first, before any filtering
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", separator, text)
    slug = text.strip(separator)
    if max_length is not None:
        if word_boundary:
            slug = _truncate_on_word(slug, max_length, separator)
        else:
            slug = slug[:max_length].rstrip(separator)
    return slug


def _truncate_on_word(slug: str, max_length: int, separator: str) -> str:
    # keep whole words while they fit; if even the first word is too long,
    # fall back to a hard cut so we never return empty when input wasn't.
    out = ""
    for word in slug.split(separator):
        candidate = word if not out else out + separator + word
        if len(candidate) <= max_length:
            out = candidate
        else:
            break
    return out or slug[:max_length].rstrip(separator)
