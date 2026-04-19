"""
Adaptador para repositório de dados do portfólio.

Interface abstrata + implementação com arquivos JSON.
"""

from abc import ABC, abstractmethod
import json
from pathlib import Path
from datetime import date
from typing import Any

import anyio

from app.entidades.projeto import Projeto
from app.entidades.experiencia import ExperienciaProfissional
from app.entidades.formacao import FormacaoAcademica
from app.entidades.philosophy import PhilosophyInspiration


class RepositorioPortfolio(ABC):
    """
    Interface abstrata para acesso aos dados do portfólio.

    Permite trocar implementação facilmente (JSON → Database → API).
    """

    @abstractmethod
    async def obter_sobre(self) -> dict:
        """Retorna informações da seção Sobre."""
        pass

    @abstractmethod
    async def obter_projetos(self) -> list[Projeto]:
        """Retorna lista de projetos."""
        pass

    @abstractmethod
    async def obter_projeto_por_id(self, projeto_id: str) -> Projeto | None:
        """Retorna um projeto específico ou None se não encontrado."""
        pass

    @abstractmethod
    async def obter_stack(self) -> list[dict]:
        """Retorna lista de tecnologias do stack."""
        pass

    @abstractmethod
    async def obter_experiencias(self) -> list[ExperienciaProfissional]:
        """Retorna lista de experiências profissionais."""
        pass

    @abstractmethod
    async def obter_formacao(self) -> list[FormacaoAcademica]:
        """Retorna lista de formações acadêmicas."""
        pass

    @abstractmethod
    async def verificar_saude(self) -> dict:
        """Verifica se o repositório está acessível."""
        pass

    @abstractmethod
    async def get_philosophy(self) -> list[PhilosophyInspiration]:
        """Returns the list of philosophical inspirations."""
        pass


# Relative path to project for JSON data
DEFAULT_DADOS_PATH = Path(__file__).parent.parent.parent / "dados"


class RepositorioJSON(RepositorioPortfolio):
    """
    Implementação de RepositorioPortfolio usando arquivos JSON.

    Lê dados de arquivos na pasta backend/dados/.

    Attributes:
        diretorio_dados: Caminho para pasta com arquivos JSON.
    """

    def __init__(self, diretorio_dados: str | Path = DEFAULT_DADOS_PATH):
        """
        Inicializa repositório JSON.

        Args:
            diretorio_dados: Caminho para pasta com dados JSON.

        Cache:
            Os arquivos JSON são lidos uma única vez do disco e mantidos
            em memória. Como os dados são estáticos (não mudam em runtime),
            isso elimina I/O redundante em cada request.
        """
        self.diretorio_dados = Path(diretorio_dados)
        self._cache: dict[str, Any] = {}

    async def verificar_saude(self) -> dict:
        """
        Verifica se os arquivos JSON básicos existem e são legíveis.
        """
        arquivos = ["sobre.json", "projetos.json", "stack.json"]
        detalhes = {}
        tudo_ok = True

        for arq in arquivos:
            caminho = self.diretorio_dados / arq
            existe = caminho.exists()
            detalhes[arq] = "ok" if existe else "ausente"
            if not existe:
                tudo_ok = False

        return {"status": "ok" if tudo_ok else "erro", "detalhes": detalhes}

    async def _ler_json(self, nome_arquivo: str) -> Any:
        """
        Lê arquivo JSON do diretório de dados de forma assíncrona.

        Utiliza cache em memória: o arquivo é lido do disco apenas na
        primeira chamada. Chamadas subsequentes retornam o valor cacheado
        sem nenhum I/O adicional.

        Args:
            nome_arquivo: Nome do arquivo (ex: "sobre.json").

        Returns:
            Conteúdo do JSON parseado.
        """
        if nome_arquivo in self._cache:
            return self._cache[nome_arquivo]

        caminho = self.diretorio_dados / nome_arquivo

        def _ler_arquivo():
            with open(caminho, "r", encoding="utf-8") as arquivo:
                return json.load(arquivo)

        dados = await anyio.to_thread.run_sync(_ler_arquivo)
        self._cache[nome_arquivo] = dados
        return dados

    async def obter_sobre(self) -> dict:
        """
        Obtém informações da seção Sobre.

        Returns:
            dict: Dados do arquivo sobre.json.
        """
        return await self._ler_json("sobre.json")

    async def obter_projetos(self) -> list[Projeto]:
        """
        Obtém lista de projetos.

        Returns:
            list[Projeto]: Lista de entidades Projeto.
        """
        dados = await self._ler_json("projetos.json")
        return [
            Projeto(
                id=p["id"],
                nome=p["nome"],
                descricao_curta=p["descricao_curta"],
                descricao_completa=p["descricao_completa"],
                tecnologias=p["tecnologias"],
                funcionalidades=p["funcionalidades"],
                aprendizados=p["aprendizados"],
                repositorio=p.get("repositorio"),
                demo=p.get("demo"),
                destaque=p.get("destaque", False),
                imagem=p.get("imagem"),
            )
            for p in dados
        ]

    async def obter_projeto_por_id(self, projeto_id: str) -> Projeto | None:
        """
        Obtém projeto específico por ID.

        Lookup O(1) via dicionário em vez de O(n) linear scan.
        O dicionário é construído uma única vez e reutilizado via cache.

        Args:
            projeto_id: ID do projeto a buscar.

        Returns:
            Projeto | None: Projeto encontrado ou None.
        """
        if "_projetos_por_id" not in self._cache:
            projetos = await self.obter_projetos()
            self._cache["_projetos_por_id"] = {p.id: p for p in projetos}
        return self._cache["_projetos_por_id"].get(projeto_id)

    async def obter_stack(self) -> list[dict]:
        """
        Obtém lista de tecnologias do stack.

        Returns:
            list[dict]: Lista de tecnologias.
        """
        return await self._ler_json("stack.json")

    async def obter_experiencias(self) -> list[ExperienciaProfissional]:
        """
        Obtém lista de experiências profissionais.

        Returns:
            list[ExperienciaProfissional]: Lista de entidades ExperienciaProfissional.
        """
        dados = await self._ler_json("experiencias.json")
        return [
            ExperienciaProfissional(
                id=e["id"],
                cargo=e["cargo"],
                empresa=e["empresa"],
                localizacao=e["localizacao"],
                data_inicio=date.fromisoformat(e["data_inicio"]),
                data_fim=date.fromisoformat(e["data_fim"])
                if e.get("data_fim")
                else None,
                descricao=e["descricao"],
                tecnologias=e["tecnologias"],
                atual=e.get("atual", False),
            )
            for e in dados
        ]

    async def obter_formacao(self) -> list[FormacaoAcademica]:
        """
        Obtém lista de formações acadêmicas.

        Returns:
            list[FormacaoAcademica]: Lista de entidades FormacaoAcademica.
        """
        dados = await self._ler_json("formacao.json")
        return [
            FormacaoAcademica(
                id=f["id"],
                curso=f["curso"],
                instituicao=f["instituicao"],
                localizacao=f["localizacao"],
                data_inicio=date.fromisoformat(f["data_inicio"]),
                data_fim=date.fromisoformat(f["data_fim"])
                if f.get("data_fim")
                else None,
                descricao=f["descricao"],
                atual=f.get("atual", False),
            )
            for f in dados
        ]

    async def get_philosophy(self) -> list[PhilosophyInspiration]:
        """
        Gets the philosophy/inspirations data.

        Returns:
            list[PhilosophyInspiration]: List of inspiration entities.
        """
        dados = await self._ler_json("philosophy.json")
        return [
            PhilosophyInspiration(
                id=i["id"],
                name=i["name"],
                role=i["role"],
                image_url=i["image_url"],
                description=i["description"],
            )
            for i in dados
        ]
