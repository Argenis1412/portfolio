"""
Use Cases: Get projects.

Pure logic, no FastAPI dependency.
"""

from app.adapters.repository import PortfolioRepository
from app.entities.project import Project


class GetProjectsUseCase:
    """
    Use case to list projects.

    Responsibility:
        - Fetch projects from the repository
        - Sort (highlighted first, then alphabetical)
        - Return project list

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

    async def execute(self) -> list[Project]:
        """
        Executes the use case with sorting.
        """
        projects = await self.repository.get_projects()
        return sorted(projects, key=lambda p: (not p.highlighted, p.name))


class GetProjectByIdUseCase:
    """
    Use case to retrieve details of a specific project.

    Responsibility:
        - Fetch project by ID from the repository
        - Return project or None if not found

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

    async def execute(self, project_id: str) -> Project | None:
        """
        Executes the use case.

        Args:
            project_id: ID of the project to search.

        Returns:
            Project | None: Found project or None.

        Example:
            >>> repo = JsonRepository()
            >>> uc = GetProjectByIdUseCase(repo)
            >>> project = await uc.execute("portfolio-api")
            >>> project.name if project else None
            'Portfolio API'
        """
        return await self.repository.get_project_by_id(project_id)
