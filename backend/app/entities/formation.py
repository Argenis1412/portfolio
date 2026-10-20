"""
Domain Entity: Academic Formation.

Represents an academic formation in the resume.
"""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class AcademicFormation:
    """
    Academic formation.

    Attributes:
        id: Unique identifier.
        course: Course name (internationalized).
        institution: Institution name.
        location: Institution location.
        start_date: Start date.
        end_date: End date (None if in progress).
        description: Formation description.
        current: Whether it's the current formation.

    The class is immutable (frozen=True) to ensure data consistency.
    """

    id: str
    course: dict
    institution: str
    location: str
    start_date: date
    end_date: date | None
    description: dict
    current: bool
