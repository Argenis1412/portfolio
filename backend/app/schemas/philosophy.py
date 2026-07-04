from pydantic import BaseModel, Field


class PhilosophyItemSchema(BaseModel):
    """
    Schema representing an inspirational philosophy item.
    """

    id: str = Field(..., description="Unique identifier", max_length=50)
    name: str = Field(..., description="Name of the philosopher", max_length=100)
    role: dict[str, str] = Field(..., description="Role or title in multiple languages")
    image_url: str = Field(
        ..., description="URL of the philosopher's image", max_length=2048
    )
    description: dict[str, str] = Field(
        ..., description="Detailed description in multiple languages"
    )


class PhilosophyResponseSchema(BaseModel):
    """
    Response schema for the list of philosophical inspirations.
    """

    inspirations: list[PhilosophyItemSchema]
    total: int
