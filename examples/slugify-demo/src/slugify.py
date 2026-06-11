import re
import unicodedata


def slugify(text: str, max_length: int | None = None) -> str:
    # fold accents to ASCII first, before any filtering
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    slug = text.strip("-")
    if max_length is not None:
        slug = slug[:max_length].rstrip("-")
    return slug
