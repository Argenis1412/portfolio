"""
Entidade de domínio: Projeto.

Representa um projeto do portfólio com todos os seus detalhes.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Projeto:
    """
    Projeto do portfólio.

    Attributes:
        id: Identificador único do projeto.
        nome: Nome do projeto.
        descricao_curta: Descrição resumida (internacionalizada).
        descricao_completa: Descrição detalhada (internacionalizada).
        tecnologias: Lista de tecnologias utilizadas.
        funcionalidades: Lista de funcionalidades implementadas.
        aprendizados: Lista de aprendizados obtidos.
        repositorio: URL do repositório (opcional).
        demo: URL da demonstração ao vivo (opcional).
        destaque: Se o projeto deve ser destacado.
        imagem: URL da imagem de capa do projeto (opcional).

    A classe é imutável (frozen=True) para garantir consistência dos dados.
    """

    id: str
    nome: str
    descricao_curta: dict
    descricao_completa: dict
    tecnologias: list[str]
    funcionalidades: list[str]
    aprendizados: list[str]
    repositorio: str | None
    demo: str | None
    destaque: bool
    imagem: str | None = field(default=None)
