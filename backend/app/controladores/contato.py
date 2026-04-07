"""
Controlador de contato.

Endpoint:
- POST /api/contato
"""

from typing import Annotated, Optional

import hashlib
import re

import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.casos_uso import EnviarContatoUseCase
from app.controladores.dependencias import obter_enviar_contato_use_case
from app.core.excecoes import ErroInfraestrutura
from app.core.idempotencia import store, verificar_idempotencia
from app.core.limite import check_rate_limit, get_client_ip, get_contact_fingerprint_key
from app.core.spam_check import calculate_spam_score
from app.core.spam_store import spam_dedup_store
from app.esquemas.contato import RequisicaoContato, RespostaContato

logger = structlog.get_logger(__name__)


def _email_domain(email: str) -> str:
    return email.split("@")[-1].lower() if "@" in email else "invalid-email"

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
    idempotency_key: Annotated[Optional[str], Depends(verificar_idempotencia)] = None,
) -> RespostaContato:
    resposta_cacheavel: RespostaContato | None = None
    content_hash: str | None = None
    dedup_reserved = False

    try:
        if requisicao.website or requisicao.fax:
            logger.info(
                "contact_blocked",
                classification="HONEYPOT",
                action="silent_drop",
                event_type="security_event",
                honeypot_fields=[
                    field for field in ("website", "fax")
                    if getattr(requisicao, field, None)
                ],
                client_ip=get_client_ip(request),
            )
            resposta_cacheavel = RespostaContato(
                sucesso=True,
                mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
            )
            return resposta_cacheavel

        spam_score = calculate_spam_score(requisicao.mensagem, requisicao.email)

        if spam_score >= 70:
            logger.info(
                "contact_classified",
                classification="SILENT_SPAM",
                action="silent_drop",
                event_type="security_event",
                spam_score=spam_score,
                email_domain=_email_domain(requisicao.email),
            )
            resposta_cacheavel = RespostaContato(
                sucesso=True,
                mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
            )
            return resposta_cacheavel

        normalized_message = re.sub(r"\s+", " ", requisicao.mensagem or "").strip().lower()
        content_str = f"{(requisicao.email or '').lower()}:{normalized_message}"
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()

        dedup_reserved = await spam_dedup_store.reserve(content_hash, ttl_seconds=1800)
        if not dedup_reserved:
            logger.info(
                "duplicate_content_detected",
                event_type="security_event",
                content_hash_prefix=content_hash[:12],
                email_domain=_email_domain(requisicao.email),
                context="shared_dedup_store",
            )
            return JSONResponse(
                status_code=400,
                content={"erro": {"codigo": "CONTEUDO_DUPLICADO"}, "detail": "DUPLICATE_CONTENT"},
            )

        check_rate_limit(request, "10/day")
        check_rate_limit(request, "20/minute")
        check_rate_limit(request, "30/hour", key_func=get_client_ip)
        check_rate_limit(request, "30/hour", key_func=get_contact_fingerprint_key)

        is_suspicious = spam_score > 30
        logger.info(
            "contact_classified",
            classification="SUSPECT" if is_suspicious else "NORMAL",
            action="deliver_with_flag" if is_suspicious else "deliver",
            spam_score=spam_score,
            email_domain=_email_domain(requisicao.email),
        )

        try:
            sucesso = await enviar_contato_uc.executar(
                nome=requisicao.nome,
                email=requisicao.email,
                assunto=requisicao.assunto,
                mensagem=requisicao.mensagem,
                is_suspicious=is_suspicious,
                spam_score=spam_score,
            )

            if sucesso:
                logger.info(
                    "Mensagem de contato processada",
                    is_suspicious=is_suspicious,
                    email_domain=_email_domain(requisicao.email),
                    client_ip=get_client_ip(request),
                )
            elif not is_suspicious:
                raise ErroInfraestrutura(
                    mensagem="Falha ao enviar mensagem de contato",
                    codigo="ERRO_ENVIO_CONTATO",
                    origem="formspree",
                )
            else:
                logger.warning(
                    "suspect_delivery_failed_silently",
                    event_type="security_event",
                    email_domain=_email_domain(requisicao.email),
                )
        except Exception as e:
            if not is_suspicious:
                if isinstance(e, ErroInfraestrutura):
                    raise e
                raise ErroInfraestrutura(
                    mensagem=str(e),
                    codigo="ERRO_INTERNO_CONTATO",
                    origem="controller",
                )

            logger.error(
                "suspect_delivery_crash_silently",
                error=str(e),
                event_type="security_event",
                email_domain=_email_domain(requisicao.email),
            )

        resposta_cacheavel = RespostaContato(
            sucesso=True,
            mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
        )
        return resposta_cacheavel
    finally:
        if dedup_reserved and content_hash and resposta_cacheavel is None:
            await spam_dedup_store.release(content_hash)

        if idempotency_key:
            if resposta_cacheavel is not None:
                await store.set(idempotency_key, 200, resposta_cacheavel.model_dump())
            else:
                await store.release(idempotency_key)
