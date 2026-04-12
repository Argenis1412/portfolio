"""
Adaptador para envio de emails.

Interface abstrata + implementação com Formspree.
"""

from abc import ABC, abstractmethod
import httpx
import structlog

from app.configuracao import configuracoes
from app.entidades.mensagem import Mensagem
from app.utils.email import mascarar_email

logger = structlog.get_logger(__name__)


class EmailAdaptador(ABC):
    """
    Interface abstrata para envio de emails.

    Permite trocar implementação facilmente (Formspree → SendGrid → SES).
    """

    @abstractmethod
    async def enviar_mensagem(self, mensagem: Mensagem) -> bool:
        """
        Envia uma mensagem por email.

        Args:
            mensagem: Mensagem a ser enviada.

        Returns:
            bool: True se enviado com sucesso, False caso contrário.
        """
        pass


class FormspreeEmailAdaptador(EmailAdaptador):
    """
    Implementação de EmailAdaptador usando Formspree.

    Formspree é um serviço gratuito que aceita formulários via POST
    e envia para um email configurado.

    Attributes:
        url_endpoint: URL completa do endpoint Formspree.
    """

    def __init__(self, formspree_url: str, form_id: str):
        """
        Inicializa o adaptador Formspree.

        Args:
            formspree_url: URL base do Formspree (ex: "https://formspree.io/f").
            form_id: ID do formulário Formspree.
        """
        self._configurado = bool(form_id and form_id.strip())
        self.url_endpoint = f"{formspree_url}/{form_id}"
        self._timeout_seconds = configuracoes.formspree_timeout_seconds

    async def enviar_mensagem(self, mensagem: Mensagem) -> bool:
        """
        Envia mensagem via Formspree.

        Args:
            mensagem: Mensagem a ser enviada.

        Returns:
            bool: True se status 200-299, False caso contrário.

        Raises:
            Não levanta exceções - captura erros e retorna False.
        """
        if not self._configurado:
            logger.warning(
                "formspree_nao_configurado",
                motivo="FORMSPREE_FORM_ID vazio",
            )
            return False

        try:
            timeout = httpx.Timeout(
                timeout=self._timeout_seconds,
                connect=min(self._timeout_seconds, 5.0),
                read=self._timeout_seconds,
                write=self._timeout_seconds,
            )
            limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)

            async with httpx.AsyncClient(timeout=timeout, limits=limits) as cliente:
                resposta = await cliente.post(
                    self.url_endpoint,
                    data={
                        "name": mensagem.nome,
                        "email": mensagem.email,
                        "subject": mensagem.assunto,
                        "_subject": mensagem.assunto,
                        "message": mensagem.mensagem,
                    },
                    headers={"Accept": "application/json"},
                )
                sucesso = resposta.status_code in range(200, 300)
                if sucesso:
                    logger.info(
                        "formspree_envio_sucesso",
                        status_code=resposta.status_code,
                    )
                else:
                    logger.warning(
                        "formspree_envio_falha_status",
                        status_code=resposta.status_code,
                    )
                return sucesso
        except httpx.TimeoutException:
            logger.error("formspree_timeout", exc_info=True)
            return False
        except httpx.HTTPError:
            logger.error("formspree_http_error", exc_info=True)
            return False


class ResendEmailAdaptador(EmailAdaptador):
    """
    Implementação de EmailAdaptador usando a API do Resend.
    """

    def __init__(self, api_key: str, from_email: str, to_email: str):
        self._api_key = api_key
        self._from_email = from_email
        self._to_email = to_email
        self._configurado = bool(api_key and api_key.strip())
        self._url = "https://api.resend.com/emails"

    async def enviar_mensagem(self, mensagem: Mensagem) -> bool:
        if not self._configurado:
            logger.warning("resend_nao_configurado", motivo="RESEND_API_KEY vazia")
            return False

        try:
            # Prepara a mensagem HTML básica
            html_content = f"""
            <h3>Novo contato do Portfólio</h3>
            <p><strong>Nome:</strong> {mensagem.nome}</p>
            <p><strong>Email:</strong> {mensagem.email}</p>
            <p><strong>Assunto:</strong> {mensagem.assunto}</p>
            <p><strong>Mensagem:</strong></p>
            <div style="white-space: pre-wrap; background: #f4f4f4; padding: 15px; border-radius: 5px;">
                {mensagem.mensagem}
            </div>
            """

            async with httpx.AsyncClient() as cliente:
                resposta = await cliente.post(
                    self._url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"Portfolio <{self._from_email}>",
                        "to": self._to_email or self._from_email,
                        "subject": mensagem.assunto,
                        "reply_to": mensagem.email,
                        "html": html_content,
                    },
                )
                
                sucesso = resposta.status_code in (200, 201)
                if sucesso:
                    logger.info("resend_envio_sucesso", id=resposta.json().get("id"))
                else:
                    logger.warning("resend_envio_falha", status=resposta.status_code, body=resposta.text)
                return sucesso

        except Exception as e:
            logger.error("resend_erro_inesperado", erro=str(e), exc_info=True)
            return False


class ConsoleEmailAdaptador(EmailAdaptador):
    """
    Adaptador de fallback que apenas loga a mensagem no console.

    Útil para desenvolvimento local quando o Formspree não está configurado.
    """

    async def enviar_mensagem(self, mensagem: Mensagem) -> bool:
        """
        Loga a mensagem no console de forma estruturada.

        Args:
            mensagem: Mensagem a ser 'enviada'.

        Returns:
            bool: Sempre True.
        """
        logger.info(
            "contact_received_console",
            name=mensagem.nome,
            email=mascarar_email(mensagem.email),
            subject=mensagem.assunto,
            message_length=len(mensagem.mensagem),
            status="intercepted_by_console",
        )
        return True
