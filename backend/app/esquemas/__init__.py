"""
Schemas Pydantic para validação de entrada/saída.

Responsabilidade:
- Definir contratos da API
- Validar dados automaticamente
- Gerar documentação OpenAPI

Schemas são diferentes de Entidades:
- Schemas: contratos HTTP (entrada/saída)
- Entidades: modelos de domínio (lógica de negócio)
"""

from app.esquemas.contato import RequisicaoContato, RespostaContato
from app.esquemas.experiencias import Experiencia, RespostaExperiencias
from app.esquemas.formacao import ItemFormacao, RespostaFormacao
from app.esquemas.projetos import ProjetoDetalhado, ProjetoResumo, RespostaProjetos
from app.esquemas.saude import RespostaSaude
from app.esquemas.sobre import RespostaSobre
from app.esquemas.stack import ItemStack, RespostaStack

__all__ = [
    "RespostaSaude",
    "RespostaSobre",
    "ProjetoResumo",
    "ProjetoDetalhado",
    "RespostaProjetos",
    "ItemStack",
    "RespostaStack",
    "Experiencia",
    "RespostaExperiencias",
    "ItemFormacao",
    "RespostaFormacao",
    "RequisicaoContato",
    "RespostaContato",
]
