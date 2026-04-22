"""
Pydantic schemas for input/output validation.

Responsibility:
- Define API contracts
- Validate data automatically
- Generate OpenAPI documentation

Schemas are different from Entities:
- Schemas: HTTP contracts (input/output)
- Entities: Domain models (business logic)
"""

from app.schemas.about import AboutResponse
from app.schemas.contact import ContactRequest, ContactResponse
from app.schemas.experiences import Experience, ExperiencesResponse
from app.schemas.formation import FormationItem, FormationResponse
from app.schemas.health import HealthResponse
from app.schemas.projects import DetailedProject, ProjectSummary, ProjectsResponse
from app.schemas.stack import StackItem, StackResponse

__all__ = [
    "HealthResponse",
    "AboutResponse",
    "ProjectSummary",
    "DetailedProject",
    "ProjectsResponse",
    "StackItem",
    "StackResponse",
    "Experience",
    "ExperiencesResponse",
    "FormationItem",
    "FormationResponse",
    "ContactRequest",
    "ContactResponse",
]
