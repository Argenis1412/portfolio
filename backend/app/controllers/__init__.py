"""
HTTP Controllers (FastAPI routes).

Responsibility:
- Receive HTTP requests
- Validate input via Pydantic
- Delegate to use cases
- Return HTTP responses

Should NOT contain business logic.
"""

from app.controllers.api import router as api_router
from app.controllers.chaos import router as chaos_router
from app.controllers.contact import router as contact_router
from app.controllers.health import router as health_router

__all__ = ["health_router", "api_router", "contact_router", "chaos_router"]
