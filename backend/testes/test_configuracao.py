import os
from app.configuracao import Configuracoes

def test_debug_desactivado_en_produccion():
    """Garante que debug é falso em produção."""
    os.environ["AMBIENTE"] = "producao"
    settings = Configuracoes()
    assert settings.debug is False
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]

def test_debug_activado_en_desarrollo():
    """Garante que debug é verdadeiro em desenvolvimento."""
    os.environ["AMBIENTE"] = "desenvolvimento"
    settings = Configuracoes()
    assert settings.debug is True
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]

def test_debug_activado_en_local():
    """Garante que debug é verdadeiro no ambiente local."""
    os.environ["AMBIENTE"] = "local"
    settings = Configuracoes()
    assert settings.debug is True
    # Limpa
    if "AMBIENTE" in os.environ:
        del os.environ["AMBIENTE"]
