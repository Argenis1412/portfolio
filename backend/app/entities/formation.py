"""
Domain Entity: Academic Formation.

Represents an academic formation in the resume.
"""

from dataclasses import dataclass
from datetime import date

from dateutil.relativedelta import relativedelta


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

    @property
    def duration_months(self) -> int:
        """
        Calculates the duration of the formation in months.

        Returns:
            int: Number of months of duration (until today if in progress).
        """
        final_date = self.end_date if self.end_date else date.today()
        difference = relativedelta(final_date, self.start_date)
        return difference.years * 12 + difference.months
