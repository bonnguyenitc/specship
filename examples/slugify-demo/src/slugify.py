import re
import unicodedata


def slugify(text: str, max_length: int | None = None, separator: str = "-") -> str:
    # fold accents to ASCII first, before any filtering
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", separator, text)
    slug = text.strip(separator)
    if max_length is not None:
        slug = slug[:max_length].rstrip(separator)
    return slug
