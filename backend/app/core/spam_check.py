"""
Spam scoring and classification logic.
"""
import re

# List of suspicious keywords common in spam (with word boundaries to avoid false positives)
SPAM_KEYWORDS = [
    r"\bcrypto\b", r"\bbitcoin\b", r"\binvestment\b", r"\bseo\b", r"\bmarketing\b", 
    r"\bcasino\b", r"\bbetting\b", r"\blottery\b", r"\bwinner\b", r"\bprize\b",
    r"\bdiscount\b", r"\burgent\b", r"\bofficial\b",
    # Spanish keywords
    r"\binvertir\b", r"\binversión\b", r"\bganar\b", r"\bganador\b",
    r"\bnegocio\b", r"\bgratis\b", r"\bpromoción\b", r"\bgana\b",
    r"\bdinero\b", r"\bhacer\b"
]

# Domains often used for temporary/burner emails
TEMP_EMAIL_DOMAINS = [
    "temp-mail.org", "10minutemail.com", "guerrillamail.com", 
    "mailinator.com", "sharklasers.com", "yopmail.com"
]

def calculate_spam_score(message: str, email: str) -> int:
    """
    Calculates a spam score based on message content and email domain.
    0-30: Normal (deliver)
    31-69: Suspect (deliver with flag)
    >=70: Silent Spam (silent drop)
    """
    score = 0
    message_lower = message.lower()
    
    # Rule 1: Message too short
    if len(message.strip()) < 10:
        score += 10
        
    # Rule 2: Excessive links (http/https occurrences)
    links = len(re.findall(r"https?://", message_lower))
    if links >= 3:
        score += 30
    elif links >= 1:
        score += 10
        
    # Rule 3: Spam keywords (more precise with word boundaries)
    keyword_matches = 0
    for kw in SPAM_KEYWORDS:
        if re.search(kw, message_lower):
            keyword_matches += 1
            
    if keyword_matches >= 2:
        score += 40
    elif keyword_matches == 1:
        score += 20
        
    # Rule 4: Temporary email domains
    email_domain = email.split('@')[-1].lower() if '@' in email else ""
    if email_domain in TEMP_EMAIL_DOMAINS:
        score += 40
        
    # Rule 5: No spaces in long message (obfuscation)
    if len(message) > 50 and ' ' not in message:
        score += 20
        
    return score
