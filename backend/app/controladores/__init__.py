"""
Controladores HTTP (rotas FastAPI).

Responsabilidade:
- Receber requisições HTTP
- Validar entrada via Pydantic
- Delegar para casos de uso
- Retornar respostas HTTP

NÃO deve conter lógica de negócio.
"""

from app.controladores.api import roteador as roteador_api
from app.controladores.chaos import roteador as roteador_chaos
from app.controladores.contato import roteador as roteador_contato
from app.controladores.saude import roteador as roteador_saude

__all__ = ["roteador_saude", "roteador_api", "roteador_contato", "roteador_chaos"]
