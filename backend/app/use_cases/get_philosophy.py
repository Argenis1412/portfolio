from typing import Protocol

from app.entities.philosophy import PhilosophyInspiration


class PhilosophyRepository(Protocol):
    """Output port (Interface) to fetch the philosophy data."""

    async def get_philosophy(self) -> list[PhilosophyInspiration]: ...


class GetPhilosophyUseCase:
    """
    Use Case: Get the system's "On the shoulders of giants" philosophy.
    """

    def __init__(self, repository: PhilosophyRepository) -> None:
        self.repository = repository

    async def execute(self) -> list[PhilosophyInspiration]:
        return await self.repository.get_philosophy()
