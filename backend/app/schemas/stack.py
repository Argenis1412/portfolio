"""
Schemas for /api/stack endpoint.

Defines contracts for tech stack listing organized by category.
"""

from enum import Enum

from pydantic import BaseModel, Field


class StackCategory(str, Enum):
    """
    Possible categories for technologies.
    """

    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    DEVOPS = "devops"
    TOOLS = "tools"


class StackItem(BaseModel):
    """
    A technology in the stack.

    Attributes:
        name: Technology name.
        category: Technology category.
        level: Proficiency level (1-5).
        icon: Icon name (optional, for frontend).
    """

    name: str = Field(
        ...,
        max_length=50,
        examples=["Python"],
        description="Technology name",
    )
    category: StackCategory = Field(
        ...,
        examples=[StackCategory.BACKEND],
        description="Technology category",
    )
    level: int = Field(
        ...,
        ge=1,
        le=5,
        examples=[4],
        description="Knowledge level (1=basic, 5=advanced)",
    )
    icon: str | None = Field(
        default=None,
        max_length=50,
        examples=["python"],
        description="Icon name for the frontend",
    )


class StackResponse(BaseModel):
    """
    Technical stack list response.

    Attributes:
        stack: List of technologies.
        by_category: Technologies grouped by category.
    """

    stack: list[StackItem] = Field(
        ...,
        description="Complete list of technologies",
    )
    by_category: dict[str, list[StackItem]] = Field(
        ...,
        description="Technologies grouped by category",
    )
