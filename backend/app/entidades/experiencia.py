"""
Entidade de domínio: Experiência Profissional.

Representa uma experiência profissional no currículo.
"""

from dataclasses import dataclass
from datetime import date
from dateutil.relativedelta import relativedelta


@dataclass(frozen=True)
class ExperienciaProfissional:
    """
    Experiência profissional.

    Attributes:
        id: Identificador único.
        cargo: Título do cargo.
        empresa: Nome da empresa.
        localizacao: Localização do trabalho.
        data_inicio: Data de início.
        data_fim: Data de término (None se atual).
        descricao: Descrição das atividades.
        tecnologias: Tecnologias utilizadas.
        atual: Se é o emprego atual.

    A classe é imutável (frozen=True) para garantir consistência dos dados.
    """

    id: str
    cargo: str
    empresa: str
    localizacao: str
    data_inicio: date
    data_fim: date | None
    descricao: dict
    tecnologias: list[str]
    atual: bool

    @property
    def duracao_meses(self) -> int:
        """
        Calcula a duração da experiência em meses.

        Returns:
            int: Número de meses de duração.

        Example:
            >>> exp = ExperienciaProfissional(
            ...     id="exp-1",
            ...     cargo="Dev",
            ...     empresa="Tech",
            ...     localizacao="Remoto",
            ...     data_inicio=date(2023, 1, 1),
            ...     data_fim=date(2023, 7, 1),
            ...     descricao="...",
            ...     tecnologias=["Python"],
            ...     atual=False
            ... )
            >>> exp.duracao_meses
            6
        """
        data_final = self.data_fim if self.data_fim else date.today()
        diferenca = relativedelta(data_final, self.data_inicio)
        return diferenca.years * 12 + diferenca.months
