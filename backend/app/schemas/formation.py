"""
Schemas for /api/v1/formation endpoint.

Defines contracts for academic formations listing.
"""

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.base_types import LocalizedText


class FormationItem(BaseModel):
    """
    An academic formation.

    Attributes:
        id: Unique identifier.
        course: Course name (internationalized).
        institution: Institution name.
        location: Institution location.
        start_date: Start date.
        end_date: End date (None if in progress).
        description: Formation description (internationalized).
        current: Whether it's the current formation.
    """

    id: str = Field(
        ...,
        examples=["edu-001"],
        description="Unique identifier",
    )
    course: LocalizedText = Field(
        ...,
        description="Course name in PT, EN and ES",
    )
    institution: str = Field(
        ...,
        max_length=150,
        examples=["UFPR – Universidade Federal do Paraná"],
        description="Institution name",
    )
    location: str = Field(
        ...,
        max_length=100,
        examples=["Curitiba, PR"],
        description="Institution location",
    )
    start_date: date = Field(
        ...,
        examples=["2026-02-01"],
        description="Start date (YYYY-MM-DD)",
    )
    end_date: date | None = Field(
        default=None,
        examples=["2029-03-06"],
        description="End date (null if in progress)",
    )
    description: LocalizedText = Field(
        ...,
        description="Description in PT, EN and ES",
    )
    current: bool = Field(
        default=False,
        description="Whether this is the current formation",
    )


class FormationResponse(BaseModel):
    """
    Academic formations list response.

    Attributes:
        formations: List of formations ordered by date.
        total: Total number of formations.
    """

    formations: list[FormationItem] = Field(
        ...,
        description="List of academic formations",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[1],
        description="Total number of formations",
    )
