"""
SQL Models using SQLModel for the database.

These models are used by SqlRepository for persistence.
Due to limitations in some SQLite drivers with the JSON type,
complex fields are stored as TEXT and manually converted in the repository.
"""

import json
from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Column, DateTime, Text, TypeDecorator
from sqlmodel import Field, SQLModel


class JSONEncoded(TypeDecorator):
    """
    Custom type to store JSON as TEXT in SQLite.
    Needed for compatibility with existing migrations.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return value


class AboutModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for the 'About' section."""

    __tablename__ = "about"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(alias="nome")
    title: str = Field(alias="titulo")
    location: str = Field(alias="localizacao")
    email: str
    phone: str = Field(alias="telefone")
    github: str
    linkedin: str
    description: dict = Field(sa_column=Column(JSON), alias="descricao")
    availability: dict = Field(sa_column=Column(JSON), alias="disponibilidade")


class ProjectModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for portfolio projects."""

    __tablename__ = "projects"

    id: str = Field(primary_key=True)
    name: str = Field(alias="nome")
    short_description: dict = Field(sa_column=Column(JSON), alias="descricao_curta")
    full_description: dict = Field(sa_column=Column(JSON), alias="descricao_completa")
    technologies: list = Field(sa_column=Column(JSON), alias="tecnologias")
    features: list = Field(sa_column=Column(JSON), alias="funcionalidades")
    learnings: list = Field(sa_column=Column(JSON), alias="aprendizados")

    repository: Optional[str] = Field(default=None, alias="repository")
    demo: Optional[str] = None
    highlighted: bool = Field(default=False, alias="destaque")
    image: Optional[str] = Field(default=None, alias="imagem")


class ExperienceModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for professional experiences."""

    __tablename__ = "experiences"

    id: str = Field(primary_key=True)
    role: dict = Field(sa_column=Column(JSON), alias="cargo")
    company: str = Field(alias="empresa")
    location: str = Field(alias="localizacao")
    start_date: date = Field(alias="data_inicio")
    end_date: Optional[date] = Field(default=None, alias="data_fim")
    description: dict = Field(sa_column=Column(JSON), alias="descricao")
    technologies: list = Field(sa_column=Column(JSON), alias="tecnologias")
    current: bool = Field(default=False, alias="atual")


class FormationModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for academic formation."""

    __tablename__ = "formacoes"

    id: str = Field(primary_key=True)
    course: dict = Field(sa_column=Column(JSON), alias="curso")
    institution: str = Field(alias="instituicao")
    location: str = Field(alias="localizacao")
    start_date: date = Field(alias="data_inicio")
    end_date: Optional[date] = Field(default=None, alias="data_fim")
    description: dict = Field(sa_column=Column(JSON), alias="descricao")
    current: bool = Field(default=False, alias="atual")


class StackModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for stack technologies."""

    __tablename__ = "stack"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(alias="nome")
    category: str = Field(alias="categoria")
    level: int = Field(alias="nivel")
    icon: Optional[str] = Field(default=None, alias="icone")


class ChaosIncidentModel(SQLModel, table=True):  # type: ignore[call-arg]
    """Model for Chaos Playground incident history."""

    __tablename__ = "chaos_incidents"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str
    timestamp: float
    requests_sent: int = 0
    requests_dropped: int = 0
    recovery_ms: int = 0
    error_triggered: bool = False
    deleted_at: Optional[datetime] = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )
