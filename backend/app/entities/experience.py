"""
Domain Entity: Professional Experience.

Represents a professional experience in the resume.
"""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class ProfessionalExperience:
    """
    Professional experience.

    Attributes:
        id: Unique identifier.
        role: Job title.
        company: Company name.
        location: Work location.
        start_date: Start date.
        end_date: End date (None if current).
        description: Activity description.
        technologies: Technologies used.
        current: Whether it's the current job.

    The class is immutable (frozen=True) to ensure data consistency.
    """

    id: str
    role: dict
    company: str
    location: str
    start_date: date
    end_date: date | None
    description: dict
    technologies: list[str]
    current: bool
