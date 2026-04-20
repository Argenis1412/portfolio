"""
Entidades de domínio (modelos de negócio).

Responsabilidade:
- Representar conceitos do domínio
- Conter lógica de negócio pura
- Ser independente de frameworks externos

Entidades são imutáveis (frozen=True) para garantir consistência.
"""

from app.entidades.experiencia import ExperienciaProfissional
from app.entidades.formacao import FormacaoAcademica
from app.entidades.mensagem import Mensagem
from app.entidades.philosophy import PhilosophyInspiration
from app.entidades.projeto import Projeto

__all__ = [
    "Mensagem",
    "Projeto",
    "ExperienciaProfissional",
    "FormacaoAcademica",
    "PhilosophyInspiration",
]
