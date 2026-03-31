"""
Caso de uso: Obter experiências profissionais.

Lógica pura, sem dependência de FastAPI.
"""

from app.adaptadores.repositorio import RepositorioPortfolio
from app.entidades.experiencia import ExperienciaProfissional


class ObterExperienciasUseCase:
    """
    Caso de uso para obter experiências profissionais.

    Responsabilidade:
        - Buscar experiências no repositório
        - Ordenar cronologicamente (mais recente primeiro)
        - Retornar lista ordenada

    Attributes:
        repositorio: Repositório de dados do portfólio.
    """

    def __init__(self, repositorio: RepositorioPortfolio):
        """
        Inicializa caso de uso.

        Args:
            repositorio: Implementação de RepositorioPortfolio.
        """
        self.repositorio = repositorio

    async def executar(self) -> list[ExperienciaProfissional]:
        """
        Executa caso de uso.

        Returns:
            list[ExperienciaProfissional]: Lista de experiências ordenadas.

        Ordenação:
            1. Experiências atuais vêm primeiro
            2. Depois por data de início (mais recente primeiro)

        Example:
            >>> repo = RepositorioJSON()
            >>> uc = ObterExperienciasUseCase(repo)
            >>> experiencias = await uc.executar()
            >>> experiencias[0].atual
            True
        """
        experiencias = await self.repositorio.obter_experiencias()
        return sorted(
            experiencias,
            key=lambda e: (not e.atual, -e.data_inicio.toordinal())
        )
