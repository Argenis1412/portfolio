"""
Domain Entity: Professional Experience.

Represents a professional experience in the resume.
"""

from dataclasses import dataclass
from datetime import date

from dateutil.relativedelta import relativedelta


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
    role: str
    company: str
    location: str
    start_date: date
    end_date: date | None
    description: dict
    technologies: list[str]
    current: bool

    @property
    def duration_months(self) -> int:
        """
        Calculates the duration of the experience in months.

        Returns:
            int: Number of months of duration.

        Example:
            >>> exp = ProfessionalExperience(
            ...     id="exp-1",
            ...     role="Dev",
            ...     company="Tech",
            ...     location="Remote",
            ...     start_date=date(2023, 1, 1),
            ...     end_date=date(2023, 7, 1),
            ...     description="...",
            ...     technologies=["Python"],
            ...     current=False
            ... )
            >>> exp.duration_months
            6
        """
        final_date = self.end_date if self.end_date else date.today()
        difference = relativedelta(final_date, self.start_date)
        return difference.years * 12 + difference.months
