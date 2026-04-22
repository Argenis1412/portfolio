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

    def to_email_text(self) -> str:
        """
        Converts the message to email text format.

        Returns:
            str: Formatted text for email sending.

        Example:
            >>> msg = Message(
            ...     name="Maria Silva",
            ...     email="maria@example.com",
            ...     subject="Opportunity",
            ...     message="I would like to talk"
            ... )
            >>> print(msg.to_email_text())
            Name: Maria Silva
            Email: maria@example.com
            Subject: Opportunity

            Message:
            I would like to talk
        """
        return f"""Name: {self.name}
Email: {self.email}
Subject: {self.subject}

Message:
{self.message}"""
