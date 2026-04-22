"""
Reusable base types for all schemas.

Defines shared Pydantic models that ensure consistency
in API response contracts.
"""

from pydantic import BaseModel, Field


class LocalizedText(BaseModel):
    """
    Text available in multiple languages.

    Used for content fields that the frontend can display
    according to user preference (PT / EN / ES).

    Attributes:
        pt: Portuguese text.
        en: English text.
        es: Spanish text.
    """

    pt: str = Field(..., description="Portuguese text")
    en: str = Field(..., description="English text")
    es: str = Field(..., description="Spanish text")
