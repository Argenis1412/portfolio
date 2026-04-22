"""
Use cases (business logic).

Responsibility:
- Orchestrate business logic
- Be independent of HTTP frameworks
- Coordinate entities and adapters

Use cases MUST NOT:
- Import FastAPI, Request, Response
- Know HTTP details
- Handle input validation (done by schemas)
"""

from app.use_cases.get_about import GetAboutUseCase
from app.use_cases.get_experiences import GetExperiencesUseCase
from app.use_cases.get_formation import GetFormationUseCase
from app.use_cases.get_philosophy import GetPhilosophyUseCase
from app.use_cases.get_projects import GetProjectByIdUseCase, GetProjectsUseCase
from app.use_cases.get_stack import GetStackUseCase
from app.use_cases.send_contact import SendContactUseCase

__all__ = [
    "GetAboutUseCase",
    "GetProjectsUseCase",
    "GetProjectByIdUseCase",
    "GetStackUseCase",
    "GetExperiencesUseCase",
    "GetFormationUseCase",
    "SendContactUseCase",
    "GetPhilosophyUseCase",
]
