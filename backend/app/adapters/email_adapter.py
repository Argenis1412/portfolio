"""
Adapter for sending emails.

Abstract interface + implementation with Resend.
"""

from abc import ABC, abstractmethod
from html import escape

import httpx
import structlog


from app.entities.message import Message
from app.core.exceptions import EmailDeliveryError
from app.utils.email import mask_email

logger = structlog.get_logger(__name__)


class EmailAdapter(ABC):
    """
    Abstract interface for sending emails.

    Allows easy implementation swaps (Resend → SendGrid → SES).
    """

    @abstractmethod
    async def send_message(self, message: Message) -> bool:
        """
        Sends an email message.

        Args:
            message: Message to be sent.

        Returns:
            bool: True if accepted by the provider, False for an unclassified failure.

        Raises:
            EmailDeliveryError: Classified provider failure, including retry policy.
        """
        pass


class ResendEmailAdapter(EmailAdapter):
    """
    EmailAdapter implementation using Resend API.
    """

    def __init__(self, api_key: str, from_email: str, to_email: str):
        self._api_key = api_key
        self._from_email = from_email
        self._to_email = to_email
        self._configured = bool(api_key and api_key.strip())
        self._url = "https://api.resend.com/emails"

    async def send_message(self, message: Message) -> bool:
        if not self._configured:
            logger.warning("resend_not_configured", reason="RESEND_API_KEY is empty")
            raise EmailDeliveryError("resend_not_configured", transient=False)

        try:
            # Prepare basic HTML message
            html_content = f"""
            <h3>New Contact from Portfolio</h3>
            <p><strong>Name:</strong> {escape(message.name)}</p>
            <p><strong>Email:</strong> {escape(message.email)}</p>
            <p><strong>Subject:</strong> {escape(message.subject)}</p>
            <p><strong>Message:</strong></p>
            <div style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px;">
                {escape(message.message)}
            </div>
            """

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self._url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": self._from_email
                        if "<" in self._from_email
                        else f"Portfolio <{self._from_email}>",
                        "to": self._to_email or self._from_email,
                        "subject": message.subject,
                        "reply_to": message.email,
                        "html": html_content,
                    },
                )

        except (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.RemoteProtocolError,
        ) as exc:
            logger.warning("resend_transport_failure", error_type=type(exc).__name__)
            raise EmailDeliveryError(
                "resend_transport_failure", transient=True
            ) from exc

        if response.status_code in (200, 201):
            logger.info("resend_send_success", status=response.status_code)
            return True

        transient = response.status_code == 429 or 500 <= response.status_code < 600
        logger.warning(
            "resend_send_failure", status=response.status_code, transient=transient
        )
        raise EmailDeliveryError(
            f"resend_http_{response.status_code}",
            transient=transient,
            status_code=response.status_code,
        )


class ConsoleEmailAdapter(EmailAdapter):
    """
    Fallback adapter that just logs the message to the console.

    Useful for local development when no email service is configured.
    """

    async def send_message(self, message: Message) -> bool:
        """
        Logs the message to the console in a structured way.

        Args:
            message: Message to be 'sent'.

        Returns:
            bool: Always True.
        """
        logger.info(
            "contact_received_console",
            name=message.name,
            email=mask_email(message.email),
            subject=message.subject,
            message_length=len(message.message),
            status="intercepted_by_console",
        )
        return True
