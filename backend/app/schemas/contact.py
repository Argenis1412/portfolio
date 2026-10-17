"""
Schemas for POST /api/contact endpoint.

Defines request and response contracts for message submission.
"""

import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class ContactRequest(BaseModel):
    """
    Contact form data.

    Validations:
        - name: 1-80 characters after whitespace normalization
        - email: valid format
        - message: 1-3000 characters
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=80,
        examples=["Maria Silva"],
        description="Sender name",
    )
    email: EmailStr = Field(
        ...,
        min_length=3,
        max_length=100,
        examples=["maria@empresa.com"],
        description="Reply-to email",
    )
    subject: Optional[str] = Field(
        default="Contact via Portfolio",
        min_length=0,
        max_length=120,
        examples=["Job opportunity"],
        description="Message subject",
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=3000,
        examples=["Hello, I saw your portfolio and would like to talk..."],
        description="Message content",
    )
    # Honeypot fields (should be empty)
    website: Optional[str] = Field(None, description="Honeypot 1")
    fax: Optional[str] = Field(None, description="Honeypot 2")
    company: Optional[str] = Field(None, description="Honeypot 3")
    middle_name: Optional[str] = Field(None, description="Honeypot 4")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        """Normalize whitespace while preserving international names."""
        value = re.sub(r"\s+", " ", value).strip()
        if not value:
            raise ValueError("Name must not be blank")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Lowercase and strip email for consistent dedup/rate-limit keying."""
        return value.strip().lower()

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: Optional[str]) -> Optional[str]:
        """Collapse whitespace in the optional subject."""
        if value is None:
            return value
        return re.sub(r"\s+", " ", value).strip()

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        """Preserve message paragraphs and reject whitespace-only content."""
        value = value.strip()
        if not value:
            raise ValueError("Message must not be blank")
        return value


class ContactResponse(BaseModel):
    """
    Response after sending a message.

    Attributes:
        success: Whether the message was successfully queued.
        message: Result description.
    """

    success: bool = Field(
        ...,
        examples=[True],
        description="Whether the submission was successful",
    )
    message: str = Field(
        ...,
        examples=["Message sent successfully!"],
        description="Result description",
    )
    queue_status: str = Field(
        default="queued",
        examples=["queued"],
        description="Queue/processing status exposed to the client",
    )
    delivery_mode: str = Field(
        default="background",
        examples=["background"],
        description="How delivery is processed after acceptance",
    )
    downstream: str = Field(
        default="email_adapter",
        examples=["resend"],
        description="Downstream provider or adapter selected by the backend",
    )
