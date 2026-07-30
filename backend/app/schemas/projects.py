"""
Schemas for /api/projects and /api/projects/{id} endpoints.

Defines contracts for project listing and details.
"""

from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.base_types import LocalizedText


class CaseStudyEvidence(BaseModel):
    """A source-backed statement displayed in a project case study."""

    label: LocalizedText
    value: str = Field(..., max_length=160)
    classification: Literal["REAL", "REPRODUCED", "SYNTHETIC"]
    source: str = Field(..., max_length=240)


class ProjectCaseStudy(BaseModel):
    """Structured, localized project narrative for detail routes."""

    problem: LocalizedText
    constraints: LocalizedText
    solution: LocalizedText
    architecture: LocalizedText
    testing: LocalizedText
    reliability: LocalizedText
    impact: LocalizedText
    evidence: list[CaseStudyEvidence] = Field(default_factory=list)


class ProjectSummary(BaseModel):
    """
    Project summary for listing.

    Used in GET /api/projects endpoint.
    """

    id: str = Field(
        ...,
        examples=["portfolio-api"],
        description="Project unique identifier",
    )
    name: str = Field(
        ...,
        max_length=100,
        examples=["Portfolio API"],
        description="Project name",
    )
    short_description: LocalizedText = Field(
        ...,
        description="Brief project description in PT, EN and ES",
    )
    full_description: LocalizedText | None = Field(
        default=None,
        description="Full story description (Problem/Constraint/Decision/Trade-off/Impact) in PT, EN and ES",
    )
    technologies: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "Pydantic"]],
        description="Technologies used",
    )
    features: list[str] = Field(
        default_factory=list,
        description="Main features or capabilities of the project",
    )
    learnings: list[str] = Field(
        default_factory=list,
        description="Key learnings from the project",
    )
    highlighted: bool = Field(
        default=False,
        description="Whether the project should be highlighted",
    )
    repository: HttpUrl | None = Field(
        default=None,
        examples=["https://github.com/Argenis1412/portfolio"],
        description="Repository URL",
    )
    demo: HttpUrl | None = Field(
        default=None,
        examples=["https://portfolio-api.railway.app"],
        description="Live demo URL",
    )
    image: HttpUrl | None = Field(
        default=None,
        description="Cover image URL",
    )
    case_study: ProjectCaseStudy | None = Field(
        default=None,
        description="Optional structured case study for project detail pages",
    )


class DetailedProject(BaseModel):
    """
    Full project details.

    Used in GET /api/projects/{id} endpoint.
    """

    id: str = Field(
        ...,
        examples=["portfolio-api"],
        description="Project unique identifier",
    )
    name: str = Field(
        ...,
        max_length=100,
        examples=["Portfolio API"],
        description="Project name",
    )
    short_description: LocalizedText = Field(
        ...,
        description="Brief project description in PT, EN and ES",
    )
    full_description: LocalizedText = Field(
        ...,
        description="Full project description in PT, EN and ES",
    )
    technologies: list[str] = Field(
        ...,
        examples=[["Python", "FastAPI", "Pydantic", "Pytest"]],
        description="Technologies used",
    )
    features: list[str] = Field(
        ...,
        examples=[["Health check", "Project CRUD", "Validation"]],
        description="Main features",
    )
    learnings: list[str] = Field(
        ...,
        examples=[["Clean Architecture", "Unit testing"]],
        description="Key learnings from the project",
    )
    repository: HttpUrl | None = Field(
        default=None,
        examples=["https://github.com/Argenis1412/portfolio"],
        description="Repository URL",
    )
    demo: HttpUrl | None = Field(
        default=None,
        examples=["https://portfolio-api.railway.app"],
        description="Live demo URL",
    )
    highlighted: bool = Field(
        default=False,
        description="Whether the project should be highlighted",
    )
    image: HttpUrl | None = Field(
        default=None,
        description="Cover image URL",
    )
    case_study: ProjectCaseStudy | None = Field(
        default=None,
        description="Optional structured case study for project detail pages",
    )


class ProjectsResponse(BaseModel):
    """
    Project list response.

    Attributes:
        projects: List of summarized projects.
        total: Total number of projects.
    """

    projects: list[ProjectSummary] = Field(
        ...,
        description="List of projects",
    )
    total: int = Field(
        ...,
        ge=0,
        examples=[3],
        description="Total number of projects",
    )
