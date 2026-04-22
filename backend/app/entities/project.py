"""
Domain Entity: Project.

Represents a portfolio project with all its details.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Project:
    """
    Portfolio project.

    Attributes:
        id: Unique project identifier.
        name: Project name.
        short_description: Brief description (internationalized).
        full_description: Detailed description (internationalized).
        technologies: List of technologies used.
        features: List of implemented features.
        learnings: List of obtained learnings.
        repository: Repository URL (optional).
        demo: Live demo URL (optional).
        highlighted: Whether the project should be highlighted.
        image: Project cover image URL (optional).

    The class is immutable (frozen=True) to ensure data consistency.
    """

    id: str
    name: str
    short_description: dict
    full_description: dict
    technologies: list[str]
    features: list[str]
    learnings: list[str]
    repository: str | None
    demo: str | None
    highlighted: bool
    image: str | None = field(default=None)
