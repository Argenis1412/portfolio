"""
Contact controller.

Endpoint:
  POST /api/contato
"""

from typing import Annotated, Optional

import structlog
from fastapi import APIRouter, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse

from app.casos_uso import EnviarContatoUseCase
from app.controladores.dependencias import obter_enviar_contato_use_case
from app.core.contact_guard import ContactGuard, email_domain
from app.core.idempotencia import store, verificar_idempotencia
from app.esquemas.contato import RequisicaoContato, RespostaContato

logger = structlog.get_logger(__name__)

_guard = ContactGuard()

roteador = APIRouter(tags=["Contato"])


async def _processar_envio_background(
    enviar_contato_uc: EnviarContatoUseCase,
    requisicao: RequisicaoContato,
    is_suspicious: bool,
    spam_score: int,
) -> None:
    """Executa o envio do contato em background, registrando logs estruturados."""
    try:
        sucesso = await enviar_contato_uc.executar(
            nome=requisicao.nome,
            email=requisicao.email,
            assunto=requisicao.assunto or "",
            mensagem=requisicao.mensagem,
            is_suspicious=is_suspicious,
            spam_score=spam_score,
        )

        if sucesso:
            logger.info(
                "contact_delivered",
                is_suspicious=is_suspicious,
                email_domain=email_domain(requisicao.email),
                delivery_mode="background",
            )
        else:
            logger.error(
                "contact_delivery_failed",
                is_suspicious=is_suspicious,
                event_type="delivery_error",
                email_domain=email_domain(requisicao.email),
                delivery_mode="background",
            )
    except Exception as e:
        logger.error(
            "contact_delivery_crash",
            error=str(e),
            event_type="system_error",
            email_domain=email_domain(requisicao.email),
            delivery_mode="background",
        )


@roteador.post(
    "/contato",
    response_model=RespostaContato,
    summary="Send contact message",
    description="Submits a contact form message via Formspree in background. Rate limited to 10 messages/day per email.",
    responses={
        200: {"description": "Message queued successfully"},
        429: {"description": "Too many requests - rate limit exceeded"},
        400: {"description": "Duplicate content"},
    },
)
async def enviar_contato(
    request: Request,
    requisicao: RequisicaoContato,
    background_tasks: BackgroundTasks,
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
        # ── 1. Honeypot check ───────────────────────────────────────────────
        if _guard.check_honeypot(requisicao):
            logger.info(
                "contact_blocked",
                classification="HONEYPOT",
                action="silent_drop",
                event_type="security_event",
            )
            resposta_cacheavel = RespostaContato(
                sucesso=True,
                mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
            )
            return resposta_cacheavel

        # ── 2. Spam score ───────────────────────────────────────────────────
        spam_score = _guard.get_spam_score(
            requisicao.mensagem,
            requisicao.email,
            nome=requisicao.nome,
            assunto=requisicao.assunto or "",
        )

        if spam_score >= ContactGuard.SCORE_SILENT_DROP:
            logger.info(
                "contact_classified",
                classification="SILENT_SPAM",
                action="silent_drop",
                event_type="security_event",
                spam_score=spam_score,
                email_domain=email_domain(requisicao.email),
            )
            resposta_cacheavel = RespostaContato(
                sucesso=True,
                mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
            )
            return resposta_cacheavel

        # ── 3. Content deduplication ────────────────────────────────────────
        content_hash = _guard.build_content_hash(requisicao.email, requisicao.mensagem)
        dedup_reserved = await _guard.reserve_dedup(content_hash)

        if not dedup_reserved:
            logger.info(
                "duplicate_content_detected",
                event_type="security_event",
                content_hash_prefix=content_hash[:12],
                email_domain=email_domain(requisicao.email),
                context="shared_dedup_store",
            )
            return JSONResponse(  # type: ignore[return-value]
                status_code=400,
                content={
                    "erro": {"codigo": "CONTEUDO_DUPLICADO"},
                    "detail": "DUPLICATE_CONTENT",
                },
            )

        # ── 4. Rate limiting ────────────────────────────────────────────────
        # Set identity on request state so the limiter uses email as the key
        request.state.identidade = f"email:{requisicao.email.lower().strip()}"
        _guard.apply_rate_limits(request)

        # ── 5. Classification logging ───────────────────────────────────────
        is_suspicious = spam_score > ContactGuard.SCORE_SUSPICIOUS
        logger.info(
            "contact_classified",
            classification="SUSPECT" if is_suspicious else "NORMAL",
            action="deliver_with_flag" if is_suspicious else "deliver",
            spam_score=spam_score,
            email_domain=email_domain(requisicao.email),
        )

        # ── 6. Delivery (Background Tasks) ──────────────────────────────────
        background_tasks.add_task(
            _processar_envio_background,
            enviar_contato_uc,
            requisicao,
            is_suspicious,
            spam_score,
        )

        logger.info(
            "contact_queued",
            is_suspicious=is_suspicious,
            email_domain=email_domain(requisicao.email),
        )

        resposta_cacheavel = RespostaContato(
            sucesso=True,
            mensagem="Mensagem enviada com sucesso! Retornarei em breve.",
        )
        return resposta_cacheavel

    finally:
        # Since it's background processed and always success to user,
        # we don't release dedup_reserved (unless it crashed before enqueueing
        # and resposta_cacheavel is None).
        if dedup_reserved and content_hash and resposta_cacheavel is None:
            await _guard.release_dedup(content_hash)

        # Persist idempotency result
        if idempotency_key:
            if resposta_cacheavel is not None:
                await store.set(idempotency_key, 200, resposta_cacheavel.model_dump())
            else:
                await store.release(idempotency_key)
