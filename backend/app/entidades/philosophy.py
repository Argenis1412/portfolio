from dataclasses import dataclass

@dataclass(frozen=True)
class PhilosophyInspiration:
    """
    Domain entity representing an inspiration or mentor in the system's philosophy.
    Roles and descriptions are multi-language (dictionaries mapped by 'en', 'es', 'pt').
    """
    id: str
    name: str
    role: dict[str, str]
    image_url: str
    description: dict[str, str]
