"""
Caso de uso: Obter formações acadêmicas.

Lógica pura, sem dependência de FastAPI.
"""

from app.adaptadores.repositorio import RepositorioPortfolio
from app.entidades.formacao import FormacaoAcademica


class ObterFormacaoUseCase:
    """
    Caso de uso para obter formações acadêmicas.

    Responsabilidade:
        - Buscar formações no repositório
        - Ordenar cronologicamente (em curso primeiro, depois mais recente)
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

    async def executar(self) -> list[FormacaoAcademica]:
        """
        Executa caso de uso.

        Returns:
            list[FormacaoAcademica]: Lista de formações ordenadas.

        Ordenação:
            1. Formações em curso vêm primeiro
            2. Depois por data de início (mais recente primeiro)
        """
        formacoes = await self.repositorio.obter_formacao()
        return sorted(
            formacoes, key=lambda f: (not f.atual, -f.data_inicio.toordinal())
        )
