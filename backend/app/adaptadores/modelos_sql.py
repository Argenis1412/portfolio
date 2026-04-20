"""
Modelos SQL usando SQLModel para o banco de dados.

Estes modelos são usados pelo RepositorioSQL para persistência.
Devido a limitações de alguns drivers SQLite com o tipo JSON,
os campos complexos são armazenados como TEXT e convertidos manualmente no repositório.
"""

import json
from datetime import date
from typing import Optional

from sqlalchemy import JSON, Column, Text, TypeDecorator
from sqlmodel import Field, SQLModel


class JSONEncoded(TypeDecorator):
    """
    Tipo customizado para armazenar JSON como TEXT no SQLite.
    Necessário para compatibilidade com migrações existentes.
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


class SobreModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para a seção 'Sobre'."""

    __tablename__ = "sobre"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    titulo: str
    localizacao: str
    email: str
    telefone: str
    github: str
    linkedin: str
    descricao: dict = Field(sa_column=Column(JSON))
    disponibilidade: dict = Field(sa_column=Column(JSON))


class ProjetoModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para projetos do portfólio."""

    __tablename__ = "projetos"

    id: str = Field(primary_key=True)
    nome: str
    descricao_curta: dict = Field(sa_column=Column(JSON))
    descricao_completa: dict = Field(sa_column=Column(JSON))
    tecnologias: list = Field(sa_column=Column(JSON))
    funcionalidades: list = Field(sa_column=Column(JSON))
    aprendizados: list = Field(sa_column=Column(JSON))

    repositorio: Optional[str] = None
    demo: Optional[str] = None
    destaque: bool = False
    imagem: Optional[str] = None


class ExperienciaModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para experiências profissionais."""

    __tablename__ = "experiencias"

    id: str = Field(primary_key=True)
    cargo: dict = Field(sa_column=Column(JSON))
    empresa: str
    localizacao: str
    data_inicio: date
    data_fim: Optional[date] = None
    descricao: dict = Field(sa_column=Column(JSON))
    tecnologias: list = Field(sa_column=Column(JSON))
    atual: bool = False


class FormacaoModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para formação acadêmica."""

    __tablename__ = "formacoes"

    id: str = Field(primary_key=True)
    curso: dict = Field(sa_column=Column(JSON))
    instituicao: str
    localizacao: str
    data_inicio: date
    data_fim: Optional[date] = None
    descricao: dict = Field(sa_column=Column(JSON))
    atual: bool = False


class StackModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para tecnologias do stack."""

    __tablename__ = "stack"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    categoria: str
    nivel: int
    icone: Optional[str] = None


class ChaosIncidentModelo(SQLModel, table=True):  # type: ignore[call-arg]
    """Modelo para histórico de incidentes do Chaos Playground."""

    __tablename__ = "chaos_incidents"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str
    timestamp: float
    requests_sent: int = 0
    requests_dropped: int = 0
    recovery_ms: int = 0
    error_triggered: bool = False
