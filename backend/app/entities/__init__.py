"""
Domain entities (business models).

Responsibility:
- Represent domain concepts
- Contain pure business logic
- Be independent of external frameworks

Entities are immutable (frozen=True) to ensure consistency.
"""

from app.entities.experience import ProfessionalExperience
from app.entities.formation import AcademicFormation
from app.entities.message import Message
from app.entities.philosophy import PhilosophyInspiration
from app.entities.project import Project

__all__ = [
    "Message",
    "Project",
    "ProfessionalExperience",
    "AcademicFormation",
    "PhilosophyInspiration",
]
