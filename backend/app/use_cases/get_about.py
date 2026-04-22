"""
Use Case: Get About section information.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository


class GetAboutUseCase:
    """
    Use case to retrieve personal information.

    Responsibility:
        - Fetch About section data from the repository
        - Return structured data

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

    async def execute(self) -> dict:
        """
        Executes the use case.

        Returns:
            dict: Personal information of the developer.

        Example:
            >>> repo = JsonRepository()
            >>> uc = GetAboutUseCase(repo)
            >>> data = await uc.execute()
            >>> data["name"]
            'Argenis Lopez'
        """
        return await self.repository.get_about()
