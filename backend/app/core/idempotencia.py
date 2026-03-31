import time
import threading
from typing import Any, Dict, Optional
from fastapi import Request, Header, HTTPException, status
from pydantic import BaseModel

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

    def get(self, key: str) -> Optional[IdempotencyRecord]:
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

    def set_in_progress(self, key: str) -> bool:
        """Marca chave como em progresso. Retorna True se conseguiu."""
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
                status_code=0,
                content={},
                timestamp=time.time(),
                in_progress=True
            )
            return True

    def set(self, key: str, status_code: int, content: Any):
        """Armazena novo registro finalizado."""
        with self._lock:
            self._cache[key] = IdempotencyRecord(
                status_code=status_code,
                content=content,
                timestamp=time.time(),
                in_progress=False
            )

# Instância global simplificada
store = IdempotencyStore()

class IdempotencyException(Exception):
    """Exceção interna para sinalizar que resposta cacheada deve ser retornada."""
    def __init__(self, record: IdempotencyRecord):
        self.record = record
        super().__init__("Idempotency HIT")

async def verificar_idempotencia(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
):
    """
    Dependency para verificar chave de idempotência.
    """
    if request.method != "POST":
        return None

    if not idempotency_key:
        return None

    record = store.get(idempotency_key)
    if record:
        if record.in_progress:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request already in progress"
            )
        raise IdempotencyException(record)

    # Bloquear chave como em progresso
    store.set_in_progress(idempotency_key)
    return idempotency_key
