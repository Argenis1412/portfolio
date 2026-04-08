"""
Exceções customizadas da aplicação.

Define hierarquia de exceções para tratamento consistente de erros.
Cada exceção mapeia para um código HTTP específico.
"""


class ErroDominio(Exception):
    """
    Exceção base para erros de regras de negócio.

    Mapeia para HTTP 400 Bad Request.
    Usado quando a requisição viola regras de domínio.

    Attributes:
        mensagem: Descrição do erro em português.
        codigo: Código interno para tracking (opcional).
    """

    def __init__(self, mensagem: str, codigo: str | None = None) -> None:
        self.mensagem = mensagem
        self.codigo = codigo or "ERRO_DOMINIO"
        super().__init__(mensagem)


class ErroValidacao(ErroDominio):
    """
    Exceção para erros de validação de dados.

    Mapeia para HTTP 422 Unprocessable Entity.
    Usado quando dados não passam em validações de negócio.

    Example:
        raise ErroValidacao("Email inválido", codigo="EMAIL_INVALIDO")
    """

    def __init__(self, mensagem: str, codigo: str | None = None) -> None:
        super().__init__(mensagem, codigo or "ERRO_VALIDACAO")


class ErroInfraestrutura(Exception):
    """
    Exceção para erros de infraestrutura externa.

    Mapeia para HTTP 500 Internal Server Error.
    Usado quando falha comunicação com sistemas externos
    (arquivos, APIs, banco de dados, etc).

    Attributes:
        mensagem: Descrição do erro.
        codigo: Código interno.
        origem: Sistema que causou o erro (opcional).
    """

    def __init__(
        self,
        mensagem: str,
        codigo: str | None = None,
        origem: str | None = None,
    ) -> None:
        self.mensagem = mensagem
        self.codigo = codigo or "ERRO_INFRAESTRUTURA"
        self.origem = origem
        super().__init__(mensagem)


class ErroRecursoNaoEncontrado(ErroDominio):
    """
    Exceção para recurso não encontrado.

    Mapeia para HTTP 404 Not Found.
    Usado quando recurso solicitado não existe.

    Example:
        raise ErroRecursoNaoEncontrado(
            "Projeto não encontrado",
            codigo="PROJETO_NAO_ENCONTRADO"
        )
    """


class ErroChaveIdempotenciaAusente(ErroDominio):
    """
    Exceção para ausência de Idempotency-Key em rotas protegidas.

    Mapeia para HTTP 400 Bad Request.
    """

    def __init__(
        self, mensagem: str = "Header 'Idempotency-Key' é obrigatório"
    ) -> None:
        super().__init__(mensagem, codigo="CHAVE_IDEMPOTENCIA_AUSENTE")
