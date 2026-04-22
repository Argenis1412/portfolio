"""
Use Case: Get professional experiences.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository
from app.entities.experience import ProfessionalExperience


class GetExperiencesUseCase:
    """
    Use case to retrieve professional experiences.

    Responsibility:
        - Fetch experiences from the repository
        - Sort chronologically (most recent first)
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

    async def execute(self) -> list[ProfessionalExperience]:
        """
        Executes the use case.

        Returns:
            list[ProfessionalExperience]: List of sorted experiences.

        Sorting:
            1. Current experiences come first
            2. Then by start date (most recent first)

        Example:
            >>> repo = JsonRepository()
            >>> uc = GetExperiencesUseCase(repo)
            >>> experiences = await uc.execute()
            >>> experiences[0].current
            True
        """
        experiences = await self.repository.get_experiences()
        return sorted(
            experiences, key=lambda e: (not e.current, -e.start_date.toordinal())
        )
