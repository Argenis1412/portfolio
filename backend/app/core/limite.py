"""
Configuração do Rate Limiter para a aplicação.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.configuracao import configuracoes


def get_email_or_ip_key(request: Request) -> str:
    """
    Recupera a identidade (e-mail) já extraída pelo middleware no request.state.
    Caso não exista, retorna o IP remoto.
    Esta função é síncrona para compatibilidade total com o Limiter.
    """
    # A identidade é populada pelo MiddlewareRequisicao para POST /api/v1/contato
    identidade = getattr(request.state, "identidade", None)
    if identidade:
        return identidade
    
    return get_remote_address(request)


# Inicializar limiter baseado no IP do cliente por padrão
# Usamos strategy='fixed-window' para simplicidade
# Si hay REDIS_URL, usamos Redis como storage para soportar escalado horizontal
limiter = Limiter(
    key_func=get_remote_address, 
    strategy="fixed-window",
    storage_uri=configuracoes.redis_url or "memory://"
)


def check_rate_limit(request: Request, limit_string: str, key_func=get_email_or_ip_key):
    """
    Realiza o hit no limiter de forma manual e levanta RateLimitExceeded se necessário.
    """
    from slowapi.errors import RateLimitExceeded
    from limits import parse_many
    
    # Mock para satisfazer o construtor do RateLimitExceeded do slowapi
    # que espera um objeto com o atributo 'error_message'
    class MockLimit:
        def __init__(self, msg):
            self.error_message = msg

    key = key_func(request)
    # Parseamos la string de límite (ej: "10/day" -> [Limit(...)])
    for limit in parse_many(limit_string):
        if not limiter.limiter.hit(limit, key):
            raise RateLimitExceeded(MockLimit(str(limit)))
