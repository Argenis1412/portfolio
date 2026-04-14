import asyncio
import os
import sys

# Adicionar o diretório raiz ao path para poder importar a app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.adaptadores.email_adaptador import ResendEmailAdaptador
from app.entidades.mensagem import Mensagem
from app.configuracao import configuracoes


async def test_resend_connection():
    """
    Teste manual para verificar se o Resend está bem configurado.
    """
    print("\nIniciando teste do Resend...")

    api_key = configuracoes.resend_api_key
    from_email = configuracoes.resend_from_email
    to_email = configuracoes.resend_to_email

    if not api_key or "tu_api_key" in api_key:
        print("ERRO: configure RESEND_API_KEY no arquivo .env")
        return

    print(f"Usando API Key: {api_key[:6]}...{api_key[-4:]}")
    print(f"De (From): {from_email}")
    print(f"Para (To): {to_email}")

    adaptador = ResendEmailAdaptador(api_key, from_email, to_email)

    mensaje_prueba = Mensagem(
        nome="Argenis Test",
        email="test@example.com",
        assunto="Teste de Sistema - Resend Live",
        mensagem="Se você recebeu isso, sua configuração do Resend e Cloudflare funciona perfeitamente!",
    )

    print("Enviando e-mail de teste...")
    sucesso = await adaptador.enviar_mensagem(mensaje_prueba)

    if sucesso:
        print("SUCESSO! O e-mail foi enviado conforme o log do Resend.")
    else:
        print("FALHA: Não foi possível enviar o e-mail.")


if __name__ == "__main__":
    # Garantir compatibilidade com Windows e Python 3.10+
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_resend_connection())
