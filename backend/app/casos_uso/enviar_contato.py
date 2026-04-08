"""
Caso de uso: Enviar mensagem de contato.

Lógica pura com operação assíncrona, sem dependência de FastAPI.
"""

from app.entidades.mensagem import Mensagem
from app.adaptadores.email_adaptador import EmailAdaptador
from app.adaptadores.logger_adaptador import LoggerAdaptador


class EnviarContatoUseCase:
    """
    Caso de uso para enviar mensagem de contato.

    Responsabilidade:
        - Criar entidade Mensagem
        - Enviar via adaptador de email
        - Registrar logs de sucesso/falha
        - Retornar resultado da operação

    Attributes:
        email_adaptador: Adaptador para envio de emails.
        logger: Adaptador para logging.
    """

    def __init__(
        self,
        email_adaptador: EmailAdaptador,
        logger: LoggerAdaptador,
    ):
        """
        Inicializa caso de uso.

        Args:
            email_adaptador: Implementação de EmailAdaptador.
            logger: Implementação de LoggerAdaptador.
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
        Executa caso de uso de envio de mensagem.

        Args:
            nome: Nome de quem enviou.
            email: Email para resposta.
            assunto: Assunto da mensagem.
            mensagem: Conteúdo da mensagem.
            is_suspicious: Se a mensagem é suspeita de spam.
            spam_score: Score heuristico usado na classificacao.

        Returns:
            bool: True se enviado com sucesso, False caso contrário.

        Example:
            >>> email_adaptador = FormspreeEmailAdaptador(url, form_id)
            >>> logger = LoggerEstruturado()
            >>> uc = EnviarContatoUseCase(email_adaptador, logger)
            >>> sucesso = await uc.executar(
            ...     "Maria",
            ...     "maria@example.com",
            ...     "Teste",
            ...     "Mensagem de teste"
            ... )
        """
        # Garantir que o assunto não esteja vazio para o Formspree
        assunto_base = (
            assunto.strip()
            if assunto and assunto.strip()
            else "Contacto vía Portafolio"
        )

        # Marcar como suspeito no assunto se necessário
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

        # Criar entidade de domínio
        mensagem_entidade = Mensagem(
            nome=nome,
            email=email,
            assunto=assunto_final,
            mensagem=mensaje_conteudo,
        )

        # Tentar enviar
        self.logger.info(
            "Tentando enviar mensagem de contato",
            remetente=nome,
            email=email,
        )

        sucesso = await self.email_adaptador.enviar_mensagem(mensagem_entidade)

        if sucesso:
            self.logger.info(
                "Mensagem de contato enviada com sucesso",
                remetente=nome,
            )
        else:
            self.logger.erro(
                "Falha ao enviar mensagem de contato",
                remetente=nome,
            )

        return sucesso
