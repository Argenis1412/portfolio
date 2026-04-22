"""
Use Case: Get technical stack.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository


class GetStackUseCase:
    """
    Use case to retrieve technical stack.

    Responsibility:
        - Fetch technologies from the repository
        - Group by category
        - Return organized data

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

    async def execute(self) -> dict[str, list[dict]]:
        """
        Executes the use case.

        Returns:
            dict: Technologies grouped by category.
            Format: {"backend": [...], "frontend": [...], ...}

        Example:
            >>> repo = JsonRepository()
            >>> uc = GetStackUseCase(repo)
            >>> result = await uc.execute()
            >>> "backend" in result
            True
            >>> len(result["backend"]) > 0
            True
        """
        stack = await self.repository.get_stack()

        # Group by category
        by_category: dict[str, list[dict]] = {}
        for item in stack:
            category = item["category"]
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(item)

        return by_category
