"""
Honeypot detection logic.
"""

def is_honeypot_triggered(form_data: dict) -> bool:
    """
    Checks if any hidden honeypot fields were filled by a bot.
    Bots often fill all available input fields automatically.
    """
    # Common fields used as honeypots
    honeypot_fields = ["website", "fax", "company", "middle_name"]
    
    for field in honeypot_fields:
        if form_data.get(field):
            return True
            
    return False
