"""
Utilities for email manipulation.
"""


def mask_email(value: str) -> str:
    """Keep at most one local-part character and normalize the domain for logs."""
    if "@" not in value:
        return "***"

    user, domain = value.split("@", 1)
    prefix = user[:1] or "*"
    return f"{prefix}***@{domain.lower()}"
