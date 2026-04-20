"""
Casos de uso (lógica de negócio).

Responsabilidade:
- Orquestrar lógica de negócio
- Ser independente de frameworks HTTP
- Coordenar entidades e adaptadores

Casos de uso NÃO devem:
- Importar FastAPI, Request, Response
- Conhecer detalhes de HTTP
- Lidar com validação de entrada (feito por schemas)
"""

from app.casos_uso.enviar_contato import EnviarContatoUseCase
from app.casos_uso.get_philosophy import GetPhilosophyUseCase
from app.casos_uso.obter_experiencias import ObterExperienciasUseCase
from app.casos_uso.obter_formacao import ObterFormacaoUseCase
from app.casos_uso.obter_projetos import ObterProjetoPorIdUseCase, ObterProjetosUseCase
from app.casos_uso.obter_sobre import ObterSobreUseCase
from app.casos_uso.obter_stack import ObterStackUseCase

__all__ = [
    "ObterSobreUseCase",
    "ObterProjetosUseCase",
    "ObterProjetoPorIdUseCase",
    "ObterStackUseCase",
    "ObterExperienciasUseCase",
    "ObterFormacaoUseCase",
    "EnviarContatoUseCase",
    "GetPhilosophyUseCase",
]
