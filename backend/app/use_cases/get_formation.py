"""
Use Case: Get academic formations.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository
from app.entities.formation import AcademicFormation


class GetFormationUseCase:
    """
    Use case to retrieve academic formations.

    Responsibility:
        - Fetch formations from the repository
        - Sort chronologically (in progress first, then most recent)
        - Return sorted list

    Attributes:
        repository: Portfolio data repository.
    """

    def __init__(self, repository: PortfolioRepository):
        """
        Initializes the use case.

        Args:
            repository: PortfolioRepository implementation.
        """
        self.repository = repository

    async def execute(self) -> list[AcademicFormation]:
        """
        Executes the use case.

        Returns:
            list[AcademicFormation]: List of sorted formations.

        Sorting:
            1. Ongoing formations come first
            2. Then by start date (most recent first)
        """
        formations = await self.repository.get_formation()
        return sorted(
            formations, key=lambda f: (not f.current, -f.start_date.toordinal())
        )
