"""
Spam scoring and classification logic.
"""

import re

# List of suspicious keywords common in spam (with word boundaries to avoid false positives)
SPAM_KEYWORDS = [
    r"\bcrypto\b",
    r"\bbitcoin\b",
    r"\bbtc\b",
    r"\bcasino\b",
    r"\bbetting\b",
    r"\blottery\b",
    r"\bwinner\b",
    r"\bprize\b",
    r"\blead generation\b",
]

SCORE_POSSIBLE_SPAM = 30
SCORE_LIKELY_SPAM = 70


# Domains often used for temporary/burner emails
TEMP_EMAIL_DOMAINS = [
    "temp-mail.org",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "sharklasers.com",
    "yopmail.com",
]


def calculate_spam_score(message: str, email: str) -> int:
    """Score content heuristics for labeling only; never reject a submission.

    0-29: normal; 30-69: possible spam; 70-100: likely spam.
    Request field validation belongs to the Pydantic schema.
    """
    score = 0
    message_lower = message.lower()

    # Rule 1: Message too short
    if len(message.strip()) < 10:
        score += 10

    # Rule 2: Excessive links
    # Capture full URL tokens for both https:// and bare www. formats.
    # We exclude common delimiters like , ; ( ) [ ] to prevent merging adjacent URLs.
    all_links_raw = re.findall(
        r"https?://[^\s,;()\[\]]+|www\.[^\s,;()\[\]]+", message_lower
    )

    def _extract_domain(url: str) -> str:
        """Normalize https://www.foo.com/path and www.foo.com → foo.com.

        Also strips trailing prose punctuation (. , ; !) that may appear when
        a URL ends a sentence, e.g. "visit www.foo.com." → "foo.com".
        """
        url = re.sub(r"^https?://", "", url)
        url = re.sub(r"^www\.", "", url)
        hostname = url.split("/")[0].split("?")[0]
        return hostname.rstrip(".,;!")

    all_links = all_links_raw
    unique_domains = set(_extract_domain(u) for u in all_links_raw)

    if len(all_links) >= 3:
        score += 45
    elif len(all_links) >= 1:
        score += 15

    # Extra suspicious: multiple links to same domain in a short message
    if len(all_links) >= 2 and len(unique_domains) == 1 and len(message) < 500:
        score += 15

    # Rule 3: Spam keywords
    keyword_matches = 0
    for kw in SPAM_KEYWORDS:
        if re.search(kw, message_lower, re.UNICODE | re.IGNORECASE):
            keyword_matches += 1

    if keyword_matches >= 3:
        score += 70
    elif keyword_matches == 2:
        score += 40
    elif keyword_matches == 1:
        score += 25

    # Rule 4: Temporary email domains
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    if email_domain in TEMP_EMAIL_DOMAINS:
        score += 50

    # Rule 5: No spaces in long message
    if len(message) > 50 and " " not in message:
        score += 30

    # Rule 6: Excessive symbols ($%@! etc)
    symbols = len(re.findall(r"[$%@!*#]", message))
    if symbols > 10:
        score += 25
    elif symbols > 5:
        score += 10

    # Rule 7: Excessive capitalization
    if len(message) > 20:
        caps_ratio = sum(1 for c in message if c.isupper()) / len(message)
        if caps_ratio > 0.4:
            score += 20

    # Rule 9: Non-alphanumeric density (symbol soup / injection payloads).
    # Legit prose: 0.03-0.13 ratio. Target garbage: ~0.59.
    # URLs stripped first (case-insensitive) to avoid false positives on param-heavy links.
    stripped = message.strip()
    url_free = re.sub(
        r"https?://[^\s,;()\[\]]+|www\.[^\s,;()\[\]]+",
        "",
        stripped,
        flags=re.IGNORECASE,
    )
    if len(url_free) >= 8:
        non_alnum = sum(1 for c in url_free if not (c.isalnum() or c.isspace()))
        density = non_alnum / len(url_free)
        if density > 0.45:
            score += 100
        elif density > 0.30:
            score += 40

    return min(score, 100)
