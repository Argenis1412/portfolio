"""
Entidade de domínio: Mensagem de contato.

Representa uma mensagem enviada pelo formulário de contato.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Mensagem:
    """
    Mensagem de contato enviada pelo formulário.

    Attributes:
        nome: Nome de quem enviou a mensagem.
        email: Email para resposta.
        assunto: Assunto da mensagem.
        mensagem: Conteúdo da mensagem.

    A classe é imutável (frozen=True) para garantir consistência dos dados.
    """

    nome: str
    email: str
    assunto: str
    mensagem: str

    def para_email_texto(self) -> str:
        """
        Converte a mensagem para formato de texto de email.

        Returns:
            str: Texto formatado para envio por email.

        Example:
            >>> msg = Mensagem(
            ...     nome="Maria Silva",
            ...     email="maria@example.com",
            ...     assunto="Oportunidade",
            ...     mensagem="Gostaria de conversar"
            ... )
            >>> print(msg.para_email_texto())
            Nome: Maria Silva
            Email: maria@example.com
            Assunto: Oportunidade

            Mensagem:
            Gostaria de conversar
        """
        return f"""Nome: {self.nome}
Email: {self.email}
Assunto: {self.assunto}

Mensagem:
{self.mensagem}"""
