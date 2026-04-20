"""
Entidade de domínio: Formação Acadêmica.

Representa uma formação acadêmica no currículo.
"""

from dataclasses import dataclass
from datetime import date

from dateutil.relativedelta import relativedelta


@dataclass(frozen=True)
class FormacaoAcademica:
    """
    Formação acadêmica.

    Attributes:
        id: Identificador único.
        curso: Nome do curso (internacionalizado).
        instituicao: Nome da instituição.
        localizacao: Localização da instituição.
        data_inicio: Data de início.
        data_fim: Data de término (None se em curso).
        descricao: Descrição da formação.
        atual: Se é a formação atual.

    A classe é imutável (frozen=True) para garantir consistência dos dados.
    """

    id: str
    curso: dict
    instituicao: str
    localizacao: str
    data_inicio: date
    data_fim: date | None
    descricao: dict
    atual: bool

    @property
    def duracao_meses(self) -> int:
        """
        Calcula a duração da formação em meses.

        Returns:
            int: Número de meses de duração (até hoje se em curso).
        """
        data_final = self.data_fim if self.data_fim else date.today()
        diferenca = relativedelta(data_final, self.data_inicio)
        return diferenca.years * 12 + diferenca.months
