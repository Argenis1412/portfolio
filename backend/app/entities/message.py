"""
Domain Entity: Contact Message.

Represents a message sent through the contact form.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Message:
    """
    Contact message sent through the form.

    Attributes:
        name: Name of the person who sent the message.
        email: Reply-to email.
        subject: Message subject.
        message: Message content.

    The class is immutable (frozen=True) to ensure data consistency.
    """

    name: str
    email: str
    subject: str
    message: str
