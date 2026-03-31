"""
Controlador de contato.

Endpoint:
- POST /api/contato
"""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Request

from app.esquemas.contato import RequisicaoContato, RespostaContato
from app.casos_uso import EnviarContatoUseCase
from app.controladores.dependencias import obter_enviar_contato_use_case, obter_repositorio
from app.adaptadores.repositorio import RepositorioPortfolio
from app.core.excecoes import ErroInfraestrutura
from app.core.limite import limiter, get_email_or_ip_key, check_rate_limit
from app.core.idempotencia import verificar_idempotencia, store
from app.core.honeypot import is_honeypot_triggered
from app.core.spam_check import calculate_spam_score
import structlog
import hashlib
import re
import time

logger = structlog.get_logger(__name__)

roteador = APIRouter(tags=["Contato"])


@roteador.post(
    "/contato",
    response_model=RespostaContato,
    summary="Send contact message",
    description="Submits a contact form message via Formspree. Rate limited to 10 messages/day per email.",
    responses={
        200: {"description": "Message sent successfully"},
        429: {"description": "Too many requests - rate limit exceeded"},
        500: {"description": "Failed to deliver message via external service"},
    },
)
async def enviar_contato(
    request: Request,
    requisicao: RequisicaoContato,
    enviar_contato_uc: Annotated[
        EnviarContatoUseCase,
        Depends(obter_enviar_contato_use_case),
    ],
    repositorio: Annotated[
        RepositorioPortfolio,
        Depends(obter_repositorio),
    ],
    idempotency_key: Annotated[Optional[str], Depends(verificar_idempotencia)] = None,
) -> RespostaContato:
    # 1. Honeypot Check (Direct Bot Trap)
    # Bots often fill all available input fields automatically.
    if requisicao.website or requisicao.fax:
        logger.info(
            "contact_blocked",
            classification="HONEYPOT",
            action="silent_drop",
            honeypot_fields=[
                field for field in ("website", "fax")
                if getattr(requisicao, field, None)
            ],
        )
        return RespostaContato(
            sucesso=True,
            mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
        )

    # 2. Spam Scoring (Heuristic Filter)
    spam_score = calculate_spam_score(requisicao.mensagem, requisicao.email)
    
    # SILENT_SPAM (>= 70)
    if spam_score >= 70:
        logger.info(
            "contact_classified",
            classification="SILENT_SPAM",
            action="silent_drop",
            spam_score=spam_score,
            email_domain=requisicao.email.split("@")[-1].lower(),
        )
        return RespostaContato(
            sucesso=True,
            mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
        )

    # 3. Verificação de conteúdo duplicado (Deduplicação Persistente de 30 minutos)
    # Normalizar mensagem: colapsar espaços, trim e lower para reduzir falsos negativos
    normalized_message = re.sub(r"\s+", " ", requisicao.mensagem or "").strip().lower()
    content_str = f"{(requisicao.email or '').lower()}:{normalized_message}"
    content_hash = hashlib.sha256(content_str.encode()).hexdigest()

    # TTL de 30 minutos (1800 segundos) para deduplicação persistente no DB
    if await repositorio.verificar_duplicata_spam(content_hash, ttl_seconds=1800):
        from fastapi.responses import JSONResponse
        logger.info(
            "duplicate_content_detected",
            content_hash=content_hash,
            email=requisicao.email,
            context="persistent_db_filter",
        )
        return JSONResponse(
            status_code=400,
            content={"erro": {"codigo": "CONTEUDO_DUPLICADO"}, "detail": "DUPLICATE_CONTENT"},
        )
 
    # Registrar contenido inmediatamente para evitar colisiones en paralelo
    await repositorio.registrar_spam(content_hash, time.time())

    # 5. Rate Limit (Manual)
    # Solo contamos como "hit" si la mensaje llegó hasta aquí (no es bot, no es spam silencioso, no es duplicado)
    # Esto evita que intentos repetidos de duplicados bloqueen al usuario por 429.
    check_rate_limit(request, "10/day")
    check_rate_limit(request, "20/minute")

    # SUSPECT (> 30)
    is_suspicious = spam_score > 30
    if is_suspicious:
        logger.info(
            "contact_classified",
            classification="SUSPECT",
            action="deliver_with_flag",
            spam_score=spam_score,
            email_domain=requisicao.email.split("@")[-1].lower(),
        )
    else:
        logger.info(
            "contact_classified",
            classification="NORMAL",
            action="deliver",
            spam_score=spam_score,
            email_domain=requisicao.email.split("@")[-1].lower(),
        )

    try:
        sucesso = await enviar_contato_uc.executar(
            nome=requisicao.nome,
            email=requisicao.email,
            assunto=requisicao.assunto,
            mensagem=requisicao.mensagem,
            is_suspicious=is_suspicious,
        )
        
        # Registrar conteúdo para evitar duplicatas nos próximos 5 minutos
        # Fazemos isso se teve sucesso REAL ou se é SUSPEITO (pois para o usuário foi "sucesso")
        if sucesso:
            logger.info(
                "Mensagem de contato processada",
                is_suspicious=is_suspicious,
                email=requisicao.email
            )
        else:
            # Falhou o envio interno
            if not is_suspicious:
                # Se falhar e NÃO for suspeito, lançamos erro real
                raise ErroInfraestrutura(
                    mensagem="Falha ao enviar mensagem de contato",
                    codigo="ERRO_ENVIO_CONTATO",
                    origem="formspree",
                )
            else:
                # Se falhar mas FOR suspeito... logamos mas o fluxo continua para o 200 OK final
                logger.warning(
                    "suspect_delivery_failed_silently",
                    email=requisicao.email
                )
    except Exception as e:
        if not is_suspicious:
            if isinstance(e, ErroInfraestrutura): raise e
            raise ErroInfraestrutura(mensagem=str(e), codigo="ERRO_INTERNO_CONTATO", origem="controller")
        else:
            logger.error("suspect_delivery_crash_silently", error=str(e), email=requisicao.email)
    

    resposta = RespostaContato(
        sucesso=True,
        mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
    )

    if idempotency_key:
        # Cache da resposta de sucesso
        store.set(idempotency_key, 200, resposta.model_dump())
    
    return resposta
