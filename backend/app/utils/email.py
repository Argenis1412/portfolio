"""
Utilities for email manipulation.
"""


def mask_email(value: str) -> str:
    """Masks an email (e.g., jo***@example.com) for safe logging."""
    if "@" not in value:
        return "invalid-email"

    user, domain = value.split("@", 1)
    prefix = user[:2] if len(user) >= 2 else user[:1]
    return f"{prefix}***@{domain.lower()}"
