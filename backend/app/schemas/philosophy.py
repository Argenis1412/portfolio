from pydantic import BaseModel, Field


class PhilosophyItemSchema(BaseModel):
    """
    Schema representing an inspirational philosophy item.
    """

    id: str
    name: str
    role: dict[str, str] = Field(..., description="Role or title in multiple languages")
    image_url: str
    description: dict[str, str] = Field(
        ..., description="Detailed description in multiple languages"
    )


class PhilosophyResponseSchema(BaseModel):
    """
    Response schema for the list of philosophical inspirations.
    """

    inspirations: list[PhilosophyItemSchema]
    total: int
