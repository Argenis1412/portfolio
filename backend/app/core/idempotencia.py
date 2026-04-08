import time
import threading
from typing import Any, Dict, Optional

from fastapi import Request, Header, HTTPException, status
from pydantic import BaseModel
from redis import asyncio as redis

from app.configuracao import configuracoes


class IdempotencyRecord(BaseModel):
    """Registro de uma resposta cacheada."""

    status_code: int
    content: Any
    timestamp: float
    in_progress: bool = False


class IdempotencyStore:
    """
    Armazenamento em memória para chaves de idempotência.
    Simplificado para este portfólio. Em produzir, usar Redis.
    """

    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        self._cache: Dict[str, IdempotencyRecord] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._redis = None

        if configuracoes.redis_url:
            self._redis = redis.from_url(
                configuracoes.redis_url,
                decode_responses=True,
                health_check_interval=30,
                socket_timeout=configuracoes.redis_socket_timeout_seconds,
                socket_connect_timeout=configuracoes.redis_connect_timeout_seconds,
            )

    def _redis_key(self, key: str) -> str:
        return f"idempotency:{key}"

    async def _redis_get(self, key: str) -> Optional[IdempotencyRecord]:
        if not self._redis:
            return None

        try:
            payload = await self._redis.get(self._redis_key(key))
        except Exception:
            return None

        if not payload:
            return None

        try:
            return IdempotencyRecord.model_validate_json(payload)
        except Exception:
            await self._redis.delete(self._redis_key(key))
            return None

    def _memory_get(self, key: str) -> Optional[IdempotencyRecord]:
        """Recupera registro se não expirado."""
        with self._lock:
            record = self._cache.get(key)
            if not record:
                return None

            # Verificar expiração
            if time.time() - record.timestamp > self.ttl_seconds:
                self._cache.pop(key, None)
                return None

            return record

    async def get(self, key: str) -> Optional[IdempotencyRecord]:
        record = await self._redis_get(key)
        if record is not None:
            return record

        return self._memory_get(key)

    async def set_in_progress(self, key: str) -> bool:
        """Marca chave como em progresso. Retorna True se conseguiu."""
        if self._redis:
            record = IdempotencyRecord(
                status_code=0,
                content={},
                timestamp=time.time(),
                in_progress=True,
            )
            try:
                acquired = await self._redis.set(
                    self._redis_key(key),
                    record.model_dump_json(),
                    ex=self.ttl_seconds,
                    nx=True,
                )
                if acquired:
                    return True
            except Exception:
                pass

        with self._lock:
            if key in self._cache:
                record = self._cache[key]
                if time.time() - record.timestamp <= self.ttl_seconds:
                    return False
                # Se expirou, sobrescreve

            if len(self._cache) >= self.max_size:
                primeira = next(iter(self._cache))
                self._cache.pop(primeira, None)

            self._cache[key] = IdempotencyRecord(
                status_code=0, content={}, timestamp=time.time(), in_progress=True
            )
            return True

    async def set(self, key: str, status_code: int, content: Any):
        """Armazena novo registro finalizado."""
        record = IdempotencyRecord(
            status_code=status_code,
            content=content,
            timestamp=time.time(),
            in_progress=False,
        )

        if self._redis:
            try:
                await self._redis.set(
                    self._redis_key(key),
                    record.model_dump_json(),
                    ex=self.ttl_seconds,
                )
                return
            except Exception:
                pass

        with self._lock:
            self._cache[key] = record

    async def release(self, key: str) -> None:
        """Libera uma chave em progresso para permitir retries seguros."""
        if self._redis:
            try:
                await self._redis.delete(self._redis_key(key))
                return
            except Exception:
                pass

        with self._lock:
            self._cache.pop(key, None)


# Instância global simplificada
store = IdempotencyStore()


class IdempotencyException(Exception):
    """Exceção interna para sinalizar que resposta cacheada deve ser retornada."""

    def __init__(self, record: IdempotencyRecord):
        self.record = record
        super().__init__("Idempotency HIT")


async def verificar_idempotencia(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    legacy_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """
    Dependency para verificar chave de idempotência.
    """
    if request.method != "POST":
        return None

    effective_key = idempotency_key or legacy_idempotency_key

    if not effective_key:
        return None

    record = await store.get(effective_key)
    if record:
        if record.in_progress:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request already in progress",
            )
        raise IdempotencyException(record)

    # Bloquear chave como em progresso
    acquired = await store.set_in_progress(effective_key)
    if not acquired:
        record = await store.get(effective_key)
        if record and not record.in_progress:
            raise IdempotencyException(record)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Request already in progress"
        )

    return effective_key
