"""
Schemas for /api/experiences endpoint.

Defines contracts for professional experiences listing.
"""

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.base_types import LocalizedText


class Experience(BaseModel):
    """
    A professional experience.

    Attributes:
        id: Unique identifier.
        role: Job title.
        company: Company name.
        location: Work location.
        start_date: Start date.
        end_date: End date (None if current).
        description: Activity description (internationalized).
        technologies: Technologies used.
        current: Whether it's the current job.
    """

    id: str = Field(
        ...,
        examples=["exp-001"],
        description="Unique identifier",
    )
    role: LocalizedText = Field(
        ...,
        description="Job title in PT, EN and ES",
    )
    company: str = Field(
        ...,
        max_length=100,
        examples=["Tech Company"],
        description="Company name",
    )
    location: str = Field(
        ...,
        max_length=100,
        examples=["Remote"],
        description="Work location",
    )
    start_date: date = Field(
        ...,
        examples=["2023-01-01"],
        description="Start date (YYYY-MM-DD)",
    )
    end_date: date | None = Field(
        default=None,
        examples=["2024-06-01"],
        description="End date (null if current position)",
    )
    description: LocalizedText = Field(
        ...,
        description="Activity description in PT, EN and ES",
    )
    technologies: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "PostgreSQL"]],
        description="Technologies used",
    )
    current: bool = Field(
        default=False,
        description="Whether this is the current position",
    )


class ExperiencesResponse(BaseModel):
    """
    Experiences list response.

    Attributes:
        experiences: List of experiences ordered by date.
        total: Total number of experiences.
    """

    experiences: list[Experience] = Field(
        ...,
        description="List of professional experiences",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[2],
        description="Total number of experiences",
    )
