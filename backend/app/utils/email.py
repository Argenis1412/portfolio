"""
Utilitários para manipulação de emails.
"""

def mascarar_email(valor: str) -> str:
    """Masca o email (ex: jo***@example.com) para logging seguro."""
    if "@" not in valor:
        return "invalid-email"

    usuario, dominio = valor.split("@", 1)
    prefixo = usuario[:2] if len(usuario) >= 2 else usuario[:1]
    return f"{prefixo}***@{dominio.lower()}"
