"""
Ajudantes de cache HTTP — geração de ETags e suporte a 304 Not Modified.

Uso dentro de uma rota FastAPI::

    from fastapi import Request, Response
    from app.core.cache_http import resposta_cacheavel

    @roteador.get("/sobre")
    async def obter_sobre(request: Request, response: Response, ...):
        dados = await uc.executar()
        return resposta_cacheavel(request, response, dados, max_age=300)

Notas de Design
---------------
- ETag é um SHA-256 do payload serializado em JSON (os primeiros 16 caracteres hex
  são suficientes para evitar colisões nesta escala).
- ``stale-while-revalidate=60`` permite que browsers/CDNs sirvam conteúdo antigo
  por mais 60s enquanto revalidam em background — UX com zero latência.
- Quando o cliente envia ``If-None-Match`` igual à ETag atual, retornamos
  um 304 sem corpo, economizando a transferência completa do payload.
"""

import hashlib
import json
from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse

_MAX_AGE_DEFAULT = 300  # 5 min
_SWR_DEFAULT = 60       # stale-while-revalidate


def _etag_de(payload: Any) -> str:
    """Calcula uma ETag curta para qualquer payload serializável em JSON."""
    serialised = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
    digest = hashlib.sha256(serialised.encode()).hexdigest()
    return f'"{digest[:16]}"'


def resposta_cacheavel(
    request: Request,
    response: Response,
    payload: Any,
    *,
    max_age: int = _MAX_AGE_DEFAULT,
    swr: int = _SWR_DEFAULT,
) -> Any:
    """
    Anexa headers de cache e lida com GET condicional (If-None-Match → 304).

    Parâmetros
    ----------
    request:  Request FastAPI recebida (necessária para ler If-None-Match).
    response: Objeto Response do FastAPI usado para definir headers em caso de 200 normal.
    payload:  O corpo da resposta (será serializado para o cálculo da ETag).
    max_age:  Cache-Control max-age em segundos (padrão 300).
    swr:      stale-while-revalidate em segundos (padrão 60).

    Retorna
    -------
    - Um ``Response(status_code=304)`` quando o cliente já possui uma cópia atualizada.
    - O ``payload`` original (sem alterações) para respostas 200 normais.
      O FastAPI irá serializá-lo como de costume via o ``response_model`` da rota.
    """
    etag = _etag_de(payload)
    cache_control = f"public, max-age={max_age}, stale-while-revalidate={swr}"

    client_etag = request.headers.get("if-none-match")
    if client_etag and client_etag == etag:
        # Client already has an up-to-date copy — skip body transmission
        return Response(
            status_code=304,
            headers={
                "ETag": etag,
                "Cache-Control": cache_control,
            },
        )

    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = cache_control
    return payload
