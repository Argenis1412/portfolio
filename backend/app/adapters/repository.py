"""
Adapter for portfolio data repository.

Abstract interface + implementation with JSON files.
"""

import json
from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
from typing import Any

import anyio

from app.entities.experience import ProfessionalExperience
from app.entities.formation import AcademicFormation
from app.entities.philosophy import PhilosophyInspiration
from app.entities.project import Project


class PortfolioRepository(ABC):
    """
    Abstract interface for portfolio data access.

    Allows easy implementation swaps (JSON → Database → API).
    """

    @abstractmethod
    async def get_about(self) -> dict:
        """Returns information for the About section."""
        pass

    @abstractmethod
    async def get_projects(self) -> list[Project]:
        """Returns the list of projects."""
        pass

    @abstractmethod
    async def get_project_by_id(self, project_id: str) -> Project | None:
        """Returns a specific project or None if not found."""
        pass

    @abstractmethod
    async def get_stack(self) -> list[dict]:
        """Returns the list of tech stack technologies."""
        pass

    @abstractmethod
    async def get_experiences(self) -> list[ProfessionalExperience]:
        """Returns the list of professional experiences."""
        pass

    @abstractmethod
    async def get_formation(self) -> list[AcademicFormation]:
        """Returns the list of academic formations."""
        pass

    @abstractmethod
    async def check_health(self) -> dict:
        """Verifies if the repository is accessible."""
        pass

    @abstractmethod
    async def get_philosophy(self) -> list[PhilosophyInspiration]:
        """Returns the list of philosophical inspirations."""
        pass


# Relative path to project for JSON data
DEFAULT_DATA_PATH = Path(__file__).parent.parent.parent / "data"


class JsonRepository(PortfolioRepository):
    """
    PortfolioRepository implementation using JSON files.

    Reads data from files in the backend/data/ folder.

    Attributes:
        data_directory: Path to the folder with JSON files.
    """

    def __init__(self, data_directory: str | Path = DEFAULT_DATA_PATH):
        """
        Initializes the JSON repository.

        Args:
            data_directory: Path to the folder with JSON data.

        Cache:
            JSON files are read once from disk and kept in memory.
            Since data is static (doesn't change at runtime),
            this eliminates redundant I/O on each request.
        """
        self.data_directory = Path(data_directory)
        self._cache: dict[str, Any] = {}

    async def check_health(self) -> dict:
        """
        Verifies if basic JSON files exist and are readable.
        """
        files = ["about.json", "projects.json", "stack.json"]
        details = {}
        all_ok = True

        for filename in files:
            path = self.data_directory / filename
            exists = path.exists()
            details[filename] = "ok" if exists else "missing"
            if not exists:
                all_ok = False

        return {"status": "ok" if all_ok else "error", "details": details}

    async def _read_json(self, filename: str) -> Any:
        """
        Reads JSON file from data directory asynchronously.

        Uses in-memory cache: file is read from disk only on the first call.
        Subsequent calls return the cached value without additional I/O.

        Args:
            filename: Filename (e.g., "about.json").

        Returns:
            Parsed JSON content.
        """
        if filename in self._cache:
            return self._cache[filename]

        path = self.data_directory / filename

        def _read_file():
            with open(path, "r", encoding="utf-8") as file:
                return json.load(file)

        data = await anyio.to_thread.run_sync(_read_file)
        self._cache[filename] = data
        return data

    async def get_about(self) -> dict:
        """
        Gets About section information.

        Returns:
            dict: Data from about.json.
        """
        return await self._read_json("about.json")

    async def get_projects(self) -> list[Project]:
        """
        Gets the list of projects.

        Returns:
            list[Project]: List of Project entities.
        """
        data = await self._read_json("projects.json")
        return [
            Project(
                id=p["id"],
                name=p["name"],
                short_description=p["short_description"],
                full_description=p["full_description"],
                technologies=p["technologies"],
                features=p["features"],
                learnings=p["learnings"],
                repository=p.get("repository"),
                demo=p.get("demo"),
                highlighted=p.get("highlight", False),
                image=p.get("image"),
            )
            for p in data
        ]

    async def get_project_by_id(self, project_id: str) -> Project | None:
        """
        Gets specific project by ID.

        O(1) lookup via dictionary instead of O(n) linear scan.
        The dictionary is built once and reused via cache.

        Args:
            project_id: ID of the project to search.

        Returns:
            Project | None: Found project or None.
        """
        if "_projects_by_id" not in self._cache:
            projects = await self.get_projects()
            self._cache["_projects_by_id"] = {p.id: p for p in projects}
        return self._cache["_projects_by_id"].get(project_id)

    async def get_stack(self) -> list[dict]:
        """
        Gets tech stack list.

        Returns:
            list[dict]: List of technologies with English keys.
        """
        data = await self._read_json("stack.json")
        # Ensure we return English keys even if reading legacy JSON
        return [
            {
                "name": item.get("name", item.get("nome")),
                "category": item.get("category", item.get("categoria")),
                "level": item.get("level", item.get("nivel")),
                "icon": item.get("icon", item.get("icone")),
            }
            for item in data
        ]

    async def get_experiences(self) -> list[ProfessionalExperience]:
        """
        Gets professional experiences list.

        Returns:
            list[ProfessionalExperience]: List of ProfessionalExperience entities.
        """
        data = await self._read_json("experiences.json")
        return [
            ProfessionalExperience(
                id=e["id"],
                role=e["role"],
                company=e["company"],
                location=e["location"],
                start_date=date.fromisoformat(e["start_date"]),
                end_date=date.fromisoformat(e["end_date"])
                if e.get("end_date")
                else None,
                description=e["description"],
                technologies=e["technologies"],
                current=e.get("current", False),
            )
            for e in data
        ]

    async def get_formation(self) -> list[AcademicFormation]:
        """
        Gets academic formations list.

        Returns:
            list[AcademicFormation]: List of AcademicFormation entities.
        """
        data = await self._read_json("formation.json")
        return [
            AcademicFormation(
                id=f["id"],
                course=f["course"],
                institution=f["institution"],
                location=f["location"],
                start_date=date.fromisoformat(f["start_date"]),
                end_date=date.fromisoformat(f["end_date"])
                if f.get("end_date")
                else None,
                description=f["description"],
                current=f.get("current", False),
            )
            for f in data
        ]

    async def get_philosophy(self) -> list[PhilosophyInspiration]:
        """
        Gets philosophy/inspirations data.

        Returns:
            list[PhilosophyInspiration]: List of inspiration entities.
        """
        data = await self._read_json("philosophy.json")
        return [
            PhilosophyInspiration(
                id=i["id"],
                name=i["name"],
                role=i["role"],
                image_url=i["image_url"],
                description=i["description"],
            )
            for i in data
        ]
