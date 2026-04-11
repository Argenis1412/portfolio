"""
Honeypot detection logic.
"""

HONEYPOT_FIELDS = ["website", "fax", "company", "middle_name"]

def is_honeypot_triggered(form_data: dict) -> bool:
    """
    Checks if any hidden honeypot fields were filled by a bot.
    Bots often fill all available input fields automatically.
    """
    for field in HONEYPOT_FIELDS:
        if form_data.get(field):
            return True

    return False
