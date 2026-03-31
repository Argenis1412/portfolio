"""
Router API v1.

Agrupa todos os endpoints da versão 1 da API.
Prefixo: /api/v1
"""

from fastapi import APIRouter

from app.controladores import api, contato

# Router principal da v1
roteador_v1 = APIRouter(
    prefix="/v1",
    tags=["API v1"],
)

# Incluir rotas de diferentes domínios
roteador_v1.include_router(api.roteador, tags=["Portfólio"])
roteador_v1.include_router(contato.roteador, tags=["Contato"])

__all__ = ["roteador_v1"]
