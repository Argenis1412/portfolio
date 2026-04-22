"""
Use Case: Get technical stack.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository


import structlog

logger = structlog.get_logger(__name__)


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
        """
        try:
            stack = await self.repository.get_stack()
        except Exception as e:
            logger.error("repository_get_stack_failed", error=str(e))
            return {}

        # Group by category
        by_category: dict[str, list[dict]] = {}
        for item in stack:
            # Support both English and legacy Portuguese keys during transition
            if not isinstance(item, dict):
                logger.warning("stack_item_not_a_dict", item_type=type(item).__name__)
                continue

            category = item.get("category", item.get("categoria"))
            if not category:
                logger.warning(
                    "stack_item_missing_category", item_name=item.get("name", "unknown")
                )
                continue

            if category not in by_category:
                by_category[category] = []
            by_category[category].append(item)

        return by_category
