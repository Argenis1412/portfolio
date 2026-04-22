"""
Use case: Send contact message.

Pure business logic with async operation, no FastAPI dependency.
"""

from app.adapters.email_adapter import EmailAdapter
from app.adapters.logger_adapter import LoggerAdapter
from app.entities.message import Message


class SendContactUseCase:
    """
    Use case for sending a contact message.

    Responsibilities:
        - Build the Message entity
        - Send via the email adapter
        - Log success / failure
        - Return the operation result

    Attributes:
        email_adapter: Adapter for sending emails.
        logger: Adapter for structured logging.
    """

    def __init__(
        self,
        email_adapter: EmailAdapter,
        logger: LoggerAdapter,
    ):
        """
        Initialises the use case with its dependencies.

        Args:
            email_adapter: Concrete implementation of EmailAdapter.
            logger: Concrete implementation of LoggerAdapter.
        """
        self.email_adapter = email_adapter
        self.logger = logger

    async def execute(
        self,
        name: str,
        email: str,
        subject: str,
        message: str,
        is_suspicious: bool = False,
        spam_score: int | None = None,
    ) -> bool:
        """
        Executes the contact message sending workflow.

        Args:
            name: Sender name.
            email: Reply-to email address.
            subject: Message subject.
            message: Message body.
            is_suspicious: Whether the message was classified as possible spam.
            spam_score: Heuristic score used for classification.

        Returns:
            bool: True if delivered successfully, False otherwise.

        Example:
            >>> email_adapter = FormspreeEmailAdapter(url, form_id)
            >>> logger = LoggerEstruturado()
            >>> uc = SendContactUseCase(email_adapter, logger)
            >>> success = await uc.execute(
            ...     "Maria",
            ...     "maria@example.com",
            ...     "Test",
            ...     "Test message"
            ... )
        """
        # Ensure subject is non-empty — Formspree requires it
        subject_base = (
            subject.strip() if subject and subject.strip() else "Contact via Portfolio"
        )

        # Prefix subject with indicator when suspicious
        subject_final = (
            f"[⚠ POSSIBLE SPAM] {subject_base}" if is_suspicious else subject_base
        )

        if is_suspicious:
            warning_lines = [
                "--- 🛡️ SECURITY WARNING (ANTI-SPAM FILTER) ---",
                "This email was classified as suspicious by automatic filters.",
                f"Risk Level: {spam_score if spam_score is not None else '?'}/100",
                f"Original Sender: {email}",
                "--------------------------------------------------",
                "",
                message,
            ]
            message_content = "\n".join(warning_lines)
        else:
            message_content = message

        # Build the domain entity
        message_entity = Message(
            name=name,
            email=email,
            subject=subject_final,
            message=message_content,
        )

        email_domain = email.split("@")[-1].lower() if "@" in email else "invalid-email"
        self.logger.info(
            "contact_delivery_attempt",
            sender=name,
            email_domain=email_domain,
        )

        success = await self.email_adapter.send_message(message_entity)

        if success:
            self.logger.info(
                "contact_message_sent",
                sender=name,
            )
        else:
            self.logger.error(
                "contact_message_failed",
                sender=name,
            )

        return success
