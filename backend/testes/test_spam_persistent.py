import pytest
import time
from app.adaptadores.repositorio_sql import RepositorioSQL
from app.adaptadores.modelos_sql import SpamFilterModelo

@pytest.mark.asyncio
async def test_persistent_spam_filter(setup_database):
    repo = RepositorioSQL(database_url=setup_database)
    content_hash = "test_hash_123"
    
    # 1. Verificar que não existe inicialmente
    is_duplicate = await repo.verificar_duplicata_spam(content_hash, ttl_seconds=1800)
    assert is_duplicate is False
    
    # 2. Registrar hash
    await repo.registrar_spam(content_hash, time.time())
    
    # 3. Verificar que agora é duplicado
    is_duplicate = await repo.verificar_duplicata_spam(content_hash, ttl_seconds=1800)
    assert is_duplicate is True
    
    # 4. Verificar expiração (mockando o tempo seria melhor, mas aqui testamos o TTL)
    is_duplicate = await repo.verificar_duplicata_spam(content_hash, ttl_seconds=-1) # Expira imediatamente
    assert is_duplicate is False
