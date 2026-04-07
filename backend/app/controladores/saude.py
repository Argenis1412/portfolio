"""
Controlador de health check.

Endpoint simples para verificar se a API está respondendo.
Usado por load balancers, kubernetes probes e monitoramento.
"""

import time
from fastapi import APIRouter, Depends, Response, status

from app.esquemas.saude import RespostaSaude
from app.configuracao import configuracoes
from app.controladores.dependencias import obter_repositorio
from app.adaptadores.repositorio import RepositorioPortfolio

roteador = APIRouter(tags=["Health"])

# Timestamp de inicialização da aplicação
_INICIO_APLICACAO = time.time()


@roteador.get(
    "/live",
    summary="API liveness check",
    description="Returns OK when the API process is running without checking external dependencies.",
)
async def verificar_liveness() -> dict:
    """Cheap liveness endpoint for keep-alive jobs and platform probes."""
    return {"status": "ok", "mensagem": "API alive"}


@roteador.get(
    "/saude",
    response_model=RespostaSaude,
    summary="API health check",
    description="Returns OK if the API is running. Includes version, environment, and detailed status of database and services.",
    responses={
        200: {"description": "API is healthy and running"},
        503: {"description": "API or its dependencies are unhealthy"},
    },
)
async def verificar_saude(
    resposta: Response,
    repositorio: RepositorioPortfolio = Depends(obter_repositorio),
) -> RespostaSaude:
    """
    Verifica se a API e suas dependências estão saudáveis.
    """
    uptime = int(time.time() - _INICIO_APLICACAO)
    
    # Verificar banco de dados
    saude_db = await repositorio.verificar_saude()
    
    # Verificar configuração de email
    email_configurado = bool(configuracoes.formspree_form_id and configuracoes.formspree_form_id.strip())
    
    detalhes = {
        "banco_dados": saude_db["status"],
        "email": "configurado" if email_configurado else "pendente",
        "detalhes_db": saude_db["detalhes"]
    }
    
    esta_saudavel = saude_db["status"] == "ok"
    
    if not esta_saudavel:
        resposta.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return RespostaSaude(
        status="ok" if esta_saudavel else "erro",
        mensagem="API funcionando normalmente" if esta_saudavel else "A API está com problemas de conexão",
        versao_api="1.0.0",
        ambiente=configuracoes.ambiente,
        uptime_segundos=uptime,
        detalhes=detalhes,
    )
