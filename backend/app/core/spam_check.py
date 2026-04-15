"""
Spam scoring and classification logic.
"""

import re

# List of suspicious keywords common in spam (with word boundaries to avoid false positives)
SPAM_KEYWORDS = [
    r"\bcrypto\b",
    r"\bbitcoin\b",
    r"\binvestment\b",
    r"\bseo\b",
    r"\bmarketing\b",
    r"\bcasino\b",
    r"\bbetting\b",
    r"\blottery\b",
    r"\bwinner\b",
    r"\bprize\b",
    r"\bdiscount\b",
    r"\burgent\b",
    r"\bofficial\b",
    r"\bagency\b",
    r"\bapp development\b",
    r"\bwebsite design\b",
    r"\bproposal\b",
    r"\bleads\b",
    r"\blead generation\b",
    r"\bfreelance\b",
    r"\boutsourcing\b",
    # Spanish/Portuguese keywords
    r"\binvertir\b",
    r"\binversión\b",
    r"\binversion\b",
    r"\bganar\b",
    r"\bganador\b",
    r"\bnegocio\b",
    r"\bgratis\b",
    r"\bpromoción\b",
    r"\bpromocion\b",
    r"\bpromoção\b",
    r"\bgana\b",
    r"\bganhe\b",
    r"\bdinero\b",
    r"\boferta\b",
    r"\binvestimento\b",
]

# Domains often used for temporary/burner emails
TEMP_EMAIL_DOMAINS = [
    "temp-mail.org",
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "sharklasers.com",
    "yopmail.com",
]


# Regexes previously in the schema, now used for scoring
NOME_REGEX = re.compile(r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .,'-]{1,79}$")
ASSUNTO_REGEX = re.compile(r"^[A-Za-zÀ-ÿ0-9 .,:;!?()/#&+@'\-]{0,120}$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def calculate_spam_score(
    message: str, email: str, nome: str = "", assunto: str = ""
) -> int:
    """
    Calculates a spam score based on message content, email, name and subject.
    0-30: Normal (deliver)
    31-69: Suspect (deliver with flag)
    >=70: Silent Spam (silent drop)

    Invalid formats now return 100 to ensure silent drop (no 422 error to user).
    """
    score = 0
    message_lower = message.lower()

    # Rule 0: Strict format validation (moved from schema to avoid 422)
    # These return 100 immediately to ensure silent drop
    if not EMAIL_REGEX.match(email):
        return 100

    if nome and not NOME_REGEX.fullmatch(nome):
        return 100

    if assunto and not ASSUNTO_REGEX.fullmatch(assunto):
        return 100

    # Rule 1: Message too short
    if len(message.strip()) < 10:
        score += 10

    # Rule 2: Excessive links
    links = len(re.findall(r"https?://|www\.", message_lower))
    if links >= 3:
        score += 40
    elif links >= 1:
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
        score += 30

    # Rule 4: Temporary email domains
    email_domain = email.split("@")[-1].lower() if "@" in email else ""
    if email_domain in TEMP_EMAIL_DOMAINS:
        score += 40

    # Rule 5: No spaces in long message
    if len(message) > 50 and " " not in message:
        score += 20

    return min(score, 100)
