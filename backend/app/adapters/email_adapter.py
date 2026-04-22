"""
Adapter for sending emails.

Abstract interface + implementation with Formspree and Resend.
"""

from abc import ABC, abstractmethod

import httpx
import structlog

from app.settings import settings
from app.entities.message import Message
from app.utils.email import mask_email

logger = structlog.get_logger(__name__)


class EmailAdapter(ABC):
    """
    Abstract interface for sending emails.

    Allows easy implementation swaps (Formspree → SendGrid → SES).
    """

    @abstractmethod
    async def send_message(self, message: Message) -> bool:
        """
        Sends an email message.

        Args:
            message: Message to be sent.

        Returns:
            bool: True if sent successfully, False otherwise.
        """
        pass


class FormspreeEmailAdapter(EmailAdapter):
    """
    EmailAdapter implementation using Formspree.

    Formspree is a service that accepts form submissions via POST
    and sends them to a configured email.

    Attributes:
        endpoint_url: Full Formspree endpoint URL.
    """

    def __init__(self, formspree_url: str, form_id: str):
        """
        Initializes the Formspree adapter.

        Args:
            formspree_url: Base Formspree URL (e.g., "https://formspree.io/f").
            form_id: Formspree form ID.
        """
        self._configured = bool(form_id and form_id.strip())
        self.endpoint_url = f"{formspree_url}/{form_id}"
        self._timeout_seconds = settings.formspree_timeout_seconds

    async def send_message(self, message: Message) -> bool:
        """
        Sends message via Formspree.

        Args:
            message: Message to be sent.

        Returns:
            bool: True if status 200-299, False otherwise.

        Raises:
            Does not raise exceptions - captures errors and returns False.
        """
        if not self._configured:
            logger.warning(
                "formspree_not_configured",
                reason="FORMSPREE_FORM_ID is empty",
            )
            return False

        try:
            timeout = httpx.Timeout(
                timeout=self._timeout_seconds,
                connect=min(self._timeout_seconds, 5.0),
                read=self._timeout_seconds,
                write=self._timeout_seconds,
            )
            limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)

            async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
                response = await client.post(
                    self.endpoint_url,
                    data={
                        "name": message.name,
                        "email": message.email,
                        "subject": message.subject,
                        "_subject": message.subject,
                        "message": message.message,
                    },
                    headers={"Accept": "application/json"},
                )
                success = response.status_code in range(200, 300)
                if success:
                    logger.info(
                        "formspree_send_success",
                        status_code=response.status_code,
                    )
                else:
                    logger.warning(
                        "formspree_send_failure_status",
                        status_code=response.status_code,
                    )
                return success
        except httpx.TimeoutException:
            logger.error("formspree_timeout", exc_info=True)
            return False
        except httpx.HTTPError:
            logger.error("formspree_http_error", exc_info=True)
            return False


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
            return False

        try:
            # Prepare basic HTML message
            html_content = f"""
            <h3>New Contact from Portfolio</h3>
            <p><strong>Name:</strong> {message.name}</p>
            <p><strong>Email:</strong> {message.email}</p>
            <p><strong>Subject:</strong> {message.subject}</p>
            <p><strong>Message:</strong></p>
            <div style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px;">
                {message.message}
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

                success = response.status_code in (200, 201)
                if success:
                    logger.info("resend_send_success", id=response.json().get("id"))
                else:
                    logger.warning(
                        "resend_send_failure",
                        status=response.status_code,
                        body=response.text,
                    )
                return success

        except Exception as e:
            logger.error("resend_unexpected_error", error=str(e), exc_info=True)
            return False


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
