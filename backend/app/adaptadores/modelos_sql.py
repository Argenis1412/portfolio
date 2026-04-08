"""
Modelos SQL usando SQLModel para o banco de dados.

Estes modelos são usados pelo RepositorioSQL para persistência.
Devido a limitações de alguns drivers SQLite com o tipo JSON, 
os campos complexos são armazenados como TEXT e convertidos manualmente no repositório.
"""

from typing import Optional
from datetime import date
import json
from sqlmodel import SQLModel, Field
from sqlalchemy import TypeDecorator, Text


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


class SobreModelo(SQLModel, table=True):
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
    # Armazenados como string JSON
    descricao: str
    disponibilidade: str


class ProjetoModelo(SQLModel, table=True):
    """Modelo para projetos do portfólio."""
    __tablename__ = "projetos"

    id: str = Field(primary_key=True)
    nome: str
    # Armazenados como string JSON
    descricao_curta: str
    descricao_completa: str
    tecnologias: str
    funcionalidades: str
    aprendizados: str
    
    repositorio: Optional[str] = None
    demo: Optional[str] = None
    destaque: bool = False
    imagem: Optional[str] = None


class ExperienciaModelo(SQLModel, table=True):
    """Modelo para experiências profissionais."""
    __tablename__ = "experiencias"

    id: str = Field(primary_key=True)
    cargo: str
    empresa: str
    localizacao: str
    data_inicio: date
    data_fim: Optional[date] = None
    # Armazenados como string JSON
    descricao: str
    tecnologias: str
    atual: bool = False


class FormacaoModelo(SQLModel, table=True):
    """Modelo para formação acadêmica."""
    __tablename__ = "formacoes"

    id: str = Field(primary_key=True)
    # Armazenados como string JSON
    curso: str
    instituicao: str
    localizacao: str
    data_inicio: date
    data_fim: Optional[date] = None
    descricao: str
    atual: bool = False


class StackModelo(SQLModel, table=True):
    """Modelo para tecnologias do stack."""
    __tablename__ = "stack"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    categoria: str
    nivel: int
    icone: Optional[str] = None


class SpamFilterModelo(SQLModel, table=True):
    """Modelo para persistência de hashes de mensagens (deduplicação)."""
    __tablename__ = "spam_filter"

    content_hash: str = Field(primary_key=True)
    timestamp: float = Field(index=True)
