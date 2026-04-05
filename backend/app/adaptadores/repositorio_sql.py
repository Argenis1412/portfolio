"""
Implementação do repositório usando SQLModel (SQL).
"""

from typing import List, Optional
from datetime import date
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

from app.adaptadores.repositorio import RepositorioPortfolio
from app.adaptadores.modelos_sql import (
    SobreModelo,
    ProjetoModelo,
    ExperienciaModelo,
    FormacaoModelo,
    StackModelo,
    SpamFilterModelo,
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
        engine_kwargs = {}
        if not database_url.startswith("sqlite"):
            engine_kwargs.update(
                pool_pre_ping=True,
                pool_recycle=300,
            )

        self.engine = create_async_engine(database_url, **engine_kwargs)
        self.session_factory = sessionmaker(
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
            # Retorna como dict para manter compatibilidade com o caso de uso
            dados = modelo.model_dump()
            dados.pop("id", None)
            dados["descricao"] = json.loads(dados["descricao"])
            dados["disponibilidade"] = json.loads(dados["disponibilidade"])
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
                    descricao_curta=json.loads(m.descricao_curta),
                    descricao_completa=json.loads(m.descricao_completa),
                    tecnologias=json.loads(m.tecnologias),
                    funcionalidades=json.loads(m.funcionalidades),
                    aprendizados=json.loads(m.aprendizados),
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
                descricao_curta=json.loads(m.descricao_curta),
                descricao_completa=json.loads(m.descricao_completa),
                tecnologias=json.loads(m.tecnologias),
                funcionalidades=json.loads(m.funcionalidades),
                aprendizados=json.loads(m.aprendizados),
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
            statement = select(ExperienciaModelo).order_by(ExperienciaModelo.data_inicio.desc())
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                ExperienciaProfissional(
                    id=m.id,
                    cargo=json.loads(m.cargo),
                    empresa=m.empresa,
                    localizacao=m.localizacao,
                    data_inicio=m.data_inicio,
                    data_fim=m.data_fim,
                    descricao=json.loads(m.descricao),
                    tecnologias=json.loads(m.tecnologias),
                    atual=m.atual,
                )
                for m in modelos
            ]

    async def obter_formacao(self) -> List[FormacaoAcademica]:
        """
        Obtém formações acadêmicas do banco de dados.
        """
        async with self.session_factory() as session:
            statement = select(FormacaoModelo).order_by(FormacaoModelo.data_inicio.desc())
            resultado = await session.exec(statement)
            modelos = resultado.all()
            return [
                FormacaoAcademica(
                    id=m.id,
                    curso=json.loads(m.curso),
                    instituicao=m.instituicao,
                    localizacao=m.localizacao,
                    data_inicio=m.data_inicio,
                    data_fim=m.data_fim,
                    descricao=json.loads(m.descricao),
                    atual=m.atual,
                )
                for m in modelos
            ]

    async def verificar_duplicata_spam(self, content_hash: str, ttl_seconds: int) -> bool:
        """
        Verifica se o hash de conteúdo já existe no banco e não expirou.
        """
        import time
        async with self.session_factory() as session:
            statement = select(SpamFilterModelo).where(SpamFilterModelo.content_hash == content_hash)
            resultado = await session.exec(statement)
            m = resultado.first()
            
            if not m:
                return False
            
            # Verificar expiração
            if time.time() - m.timestamp > ttl_seconds:
                # Remove expirado (limpeza lazy)
                await session.delete(m)
                await session.commit()
                return False
                
            return True

    async def registrar_spam(self, content_hash: str, timestamp: float) -> None:
        """
        Registra o hash de uma mensagem enviada.
        """
        async with self.session_factory() as session:
            # Usar upsert manual ou apenas ignorar se já existe (embora o fluxo garanta unicidade)
            novo = SpamFilterModelo(content_hash=content_hash, timestamp=timestamp)
            session.add(novo)
            try:
                await session.commit()
            except:
                await session.rollback()
