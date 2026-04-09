"""
Use case: Send contact message.

Pure business logic with async operation, no FastAPI dependency.
"""

from app.entidades.mensagem import Mensagem
from app.adaptadores.email_adaptador import EmailAdaptador
from app.adaptadores.logger_adaptador import LoggerAdaptador


class EnviarContatoUseCase:
    """
    Use case for sending a contact message.

    Responsibilities:
        - Build the Message entity
        - Send via the email adapter
        - Log success / failure
        - Return the operation result

    Attributes:
        email_adaptador: Adapter for sending emails.
        logger: Adapter for structured logging.
    """

    def __init__(
        self,
        email_adaptador: EmailAdaptador,
        logger: LoggerAdaptador,
    ):
        """
        Initialises the use case with its dependencies.

        Args:
            email_adaptador: Concrete implementation of EmailAdaptador.
            logger: Concrete implementation of LoggerAdaptador.
        """
        self.email_adaptador = email_adaptador
        self.logger = logger

    async def executar(
        self,
        nome: str,
        email: str,
        assunto: str,
        mensagem: str,
        is_suspicious: bool = False,
        spam_score: int | None = None,
    ) -> bool:
        """
        Executes the contact message sending workflow.

        Args:
            nome: Sender name.
            email: Reply-to email address.
            assunto: Message subject.
            mensagem: Message body.
            is_suspicious: Whether the message was classified as possible spam.
            spam_score: Heuristic score used for classification.

        Returns:
            bool: True if delivered successfully, False otherwise.

        Example:
            >>> email_adaptador = FormspreeEmailAdaptador(url, form_id)
            >>> logger = LoggerEstruturado()
            >>> uc = EnviarContatoUseCase(email_adaptador, logger)
            >>> sucesso = await uc.executar(
            ...     "Maria",
            ...     "maria@example.com",
            ...     "Test",
            ...     "Test message"
            ... )
        """
        # Ensure subject is non-empty — Formspree requires it
        assunto_base = (
            assunto.strip() if assunto and assunto.strip() else "Contact via Portfolio"
        )

        # Prefix subject with spam marker when suspicious
        assunto_final = (
            f"[POSSIBLE SPAM] {assunto_base}" if is_suspicious else assunto_base
        )

        if is_suspicious:
            warning_lines = [
                "SECURITY ALERT: POSSIBLE SPAM",
                f"Spam score: {spam_score if spam_score is not None else 'unknown'}/100",
                f"Sender email: {email}",
                "Review this message before replying.",
                "",
                mensagem,
            ]
            mensaje_conteudo = "\n".join(warning_lines)
        else:
            mensaje_conteudo = mensagem

        # Build the domain entity
        mensagem_entidade = Mensagem(
            nome=nome,
            email=email,
            assunto=assunto_final,
            mensagem=mensaje_conteudo,
        )

        # Attempt delivery
        self.logger.info(
            "contact_delivery_attempt",
            remetente=nome,
            email=email,
        )

        sucesso = await self.email_adaptador.enviar_mensagem(mensagem_entidade)

        if sucesso:
            self.logger.info(
                "contact_message_sent",
                remetente=nome,
            )
        else:
            self.logger.erro(
                "contact_message_failed",
                remetente=nome,
            )

        return sucesso
