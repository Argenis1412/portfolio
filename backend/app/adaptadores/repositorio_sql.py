"""
Implementação do repositório usando SQLModel (SQL).
"""

from typing import List, Optional, Any
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.adaptadores.repositorio import RepositorioPortfolio
from app.adaptadores.modelos_sql import (
    SobreModelo,
    ProjetoModelo,
    ExperienciaModelo,
    FormacaoModelo,
    StackModelo,
)
from app.entidades.projeto import Projeto
from app.entidades.experiencia import ExperienciaProfissional
from app.entidades.formacao import FormacaoAcademica
from app.configuracao import configuracoes


class RepositorioSQL(RepositorioPortfolio):
    """
    Implementação de RepositorioPortfolio usando SQLModel.

    Conecta a um banco de dados SQL (ex: SQLite, PostgreSQL).
    """

    def __init__(self, database_url: str = configuracoes.database_url):
        """
        Inicializa o repositório SQL.

        Args:
            database_url: URL de conexão com o banco de dados.
        """
        engine_kwargs: dict[str, Any] = {}
        if not database_url.startswith("sqlite"):
            engine_kwargs.update(
                pool_size=configuracoes.db_pool_size,
                max_overflow=configuracoes.db_max_overflow,
                pool_recycle=configuracoes.db_pool_recycle_seconds,
                pool_timeout=configuracoes.db_pool_timeout_seconds,
                pool_use_lifo=configuracoes.db_pool_use_lifo,
                pool_pre_ping=True,
                connect_args={
                    "timeout": configuracoes.db_connect_timeout_seconds,
                    "command_timeout": configuracoes.db_command_timeout_seconds,
                    "server_settings": {"application_name": configuracoes.nome_app},
                },
            )

        self.engine = create_async_engine(database_url, **engine_kwargs)
        self.session_factory = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def verificar_saude(self) -> dict:
        """
        Verifica se a conexão com o banco de dados está ativa.
        """
        try:
            async with self.session_factory() as session:
                await session.exec(text("SELECT 1"))
            return {"status": "ok", "detalhes": "Banco de dados SQL conectado"}
        except Exception as e:
            return {"status": "erro", "detalhes": f"Falha na conexão SQL: {str(e)}"}

    async def obter_sobre(self) -> dict:
        """
        Obtém informações da seção Sobre do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(SobreModelo)
            resultado = await session.exec(statement)
            modelo = resultado.first()
            if not modelo:
                return {}
            # Return as dict to maintain use case compatibility
            dados = modelo.model_dump()
            dados.pop("id", None)
            dados["descricao"] = dados["descricao"]
            dados["disponibilidade"] = dados["disponibilidade"]
            return dados

    async def obter_projetos(self) -> List[Projeto]:
        """
        Obtém todos os projetos do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(ProjetoModelo)
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                Projeto(
                    id=m.id,
                    nome=m.nome,
                    descricao_curta=m.descricao_curta,
                    descricao_completa=m.descricao_completa,
                    tecnologias=m.tecnologias,
                    funcionalidades=m.funcionalidades,
                    aprendizados=m.aprendizados,
                    repositorio=m.repositorio,
                    demo=m.demo,
                    destaque=m.destaque,
                    imagem=m.imagem,
                )
                for m in modelos
            ]

    async def obter_projeto_por_id(self, projeto_id: str) -> Optional[Projeto]:
        """
        Busca um projeto específico por ID.
        """
        async with self.session_factory() as session:
            statement = select(ProjetoModelo).where(ProjetoModelo.id == projeto_id)
            resultado = await session.exec(statement)
            m = resultado.first()
            if not m:
                return None
            return Projeto(
                id=m.id,
                nome=m.nome,
                descricao_curta=m.descricao_curta,
                descricao_completa=m.descricao_completa,
                tecnologias=m.tecnologias,
                funcionalidades=m.funcionalidades,
                aprendizados=m.aprendizados,
                repositorio=m.repositorio,
                demo=m.demo,
                destaque=m.destaque,
                imagem=m.imagem,
            )

    async def obter_stack(self) -> List[dict]:
        """
        Obtém o stack tecnológico do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(StackModelo)
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                {
                    "nome": m.nome,
                    "categoria": m.categoria,
                    "nivel": m.nivel,
                    "icone": m.icone,
                }
                for m in modelos
            ]

    async def obter_experiencias(self) -> List[ExperienciaProfissional]:
        """
        Obtém experiências profissionais do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(ExperienciaModelo).order_by(
                col(ExperienciaModelo.data_inicio).desc()
            )
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                ExperienciaProfissional(
                    id=m.id,
                    cargo=m.cargo,
                    empresa=m.empresa,
                    localizacao=m.localizacao,
                    data_inicio=m.data_inicio,
                    data_fim=m.data_fim,
                    descricao=m.descricao,
                    tecnologias=m.tecnologias,
                    atual=m.atual,
                )
                for m in modelos
            ]

    async def obter_formacao(self) -> List[FormacaoAcademica]:
        """
        Obtém formações acadêmicas do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(FormacaoModelo).order_by(
                col(FormacaoModelo.data_inicio).desc()
            )
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                FormacaoAcademica(
                    id=m.id,
                    curso=m.curso,
                    instituicao=m.instituicao,
                    localizacao=m.localizacao,
                    data_inicio=m.data_inicio,
                    data_fim=m.data_fim,
                    descricao=m.descricao,
                    atual=m.atual,
                )
                for m in modelos
            ]
