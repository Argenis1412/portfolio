"""
Caso de uso: Obter stack tecnológico.

Lógica pura, sem dependência de FastAPI.
"""

from app.adaptadores.repositorio import RepositorioPortfolio


class ObterStackUseCase:
    """
    Caso de uso para obter stack tecnológico.

    Responsabilidade:
        - Buscar tecnologias no repositório
        - Agrupar por categoria
        - Retornar dados organizados

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

    async def executar(self) -> dict[str, list[dict]]:
        """
        Executa caso de uso.

        Returns:
            dict: Tecnologias agrupadas por categoria.
            Formato: {"backend": [...], "frontend": [...], ...}

        Example:
            >>> repo = RepositorioJSON()
            >>> uc = ObterStackUseCase(repo)
            >>> resultado = await uc.executar()
            >>> "backend" in resultado
            True
            >>> len(resultado["backend"]) > 0
            True
        """
        stack = await self.repositorio.obter_stack()

        # Agrupar por categoria
        por_categoria: dict[str, list[dict]] = {}
        for item in stack:
            categoria = item["categoria"]
            if categoria not in por_categoria:
                por_categoria[categoria] = []
            por_categoria[categoria].append(item)

        return por_categoria
