"""
Controlador de rotas da API.

Endpoints:
- GET /api/sobre
- GET /api/projetos
- GET /api/projetos/{projeto_id}
- GET /api/stack
- GET /api/experiencias
- GET /api/formacao
"""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Request

from app.esquemas.sobre import RespostaSobre
from app.esquemas.projetos import ProjetoResumo, ProjetoDetalhado, RespostaProjetos
from app.esquemas.stack import ItemStack, RespostaStack
from app.esquemas.experiencias import Experiencia, RespostaExperiencias
from app.esquemas.formacao import ItemFormacao, RespostaFormacao
from app.casos_uso import (
    ObterExperienciasUseCase,
    ObterFormacaoUseCase,
    ObterProjetoPorIdUseCase,
    ObterProjetosUseCase,
    ObterSobreUseCase,
    ObterStackUseCase,
)
from app.controladores.dependencias import (
    obter_obter_experiencias_use_case,
    obter_obter_formacao_use_case,
    obter_obter_projeto_por_id_use_case,
    obter_obter_projetos_use_case,
    obter_obter_sobre_use_case,
    obter_obter_stack_use_case,
)
from app.core.excecoes import ErroRecursoNaoEncontrado
from app.core.limite import limiter

roteador = APIRouter(tags=["API"])


@roteador.get(
    "/sobre",
    response_model=RespostaSobre,
    summary="Developer information",
    description="Returns 'About Me' section data with multi-language text fields.",
    responses={
        200: {"description": "Personal information returned successfully"},
    },
)
async def obter_sobre(
    obter_sobre_uc: Annotated[
        ObterSobreUseCase,
        Depends(obter_obter_sobre_use_case),
    ],
) -> RespostaSobre:
    """
    Obtém informações pessoais do desenvolvedor.

    Returns:
        RespostaSobre: Dados pessoais validados.
    """
    dados = await obter_sobre_uc.executar()
    return RespostaSobre(**dados)


@roteador.get(
    "/projetos",
    response_model=RespostaProjetos,
    summary="List projects",
    description="Returns list of projects ordered by highlight status (featured first).",
    responses={
        200: {"description": "Projects list returned successfully"},
    },
)
@limiter.limit("20/minute")
async def listar_projetos(
    request: Request,
    obter_projetos_uc: Annotated[
        ObterProjetosUseCase,
        Depends(obter_obter_projetos_use_case),
    ],
) -> RespostaProjetos:
    """
    Lista todos os projetos do portfólio.

    Returns:
        RespostaProjetos: Lista de projetos resumidos.

    Ordenação:
        Projetos em destaque aparecem primeiro, depois ordem alfabética.
    """
    projetos = await obter_projetos_uc.executar()

    projetos_resumo = [
        ProjetoResumo(
            id=p.id,
            nome=p.nome,
            descricao_curta=p.descricao_curta,
            tecnologias=p.tecnologias,
            destaque=p.destaque,
            repositorio=p.repositorio,
            demo=p.demo,
            imagem=p.imagem,
        )
        for p in projetos
    ]

    return RespostaProjetos(
        projetos=projetos_resumo,
        total=len(projetos_resumo),
    )


@roteador.get(
    "/projetos/{projeto_id}",
    response_model=ProjetoDetalhado,
    summary="Project details",
    description="Returns full details of a specific project by its ID.",
    responses={
        200: {
            "description": "Project found",
            "content": {
                "application/json": {
                    "example": {
                        "id": "portfolio-api",
                        "nome": "Portfolio API",
                        "descricao_curta": {"pt": "...", "en": "...", "es": "..."},
                        "descricao_completa": {"pt": "...", "en": "...", "es": "..."},
                        "tecnologias": ["Python", "FastAPI"],
                        "funcionalidades": ["CRUD", "Validation"],
                        "aprendizados": ["Clean Architecture"],
                        "repositorio": "https://github.com/...",
                        "demo": None,
                        "destaque": True,
                        "imagem": None,
                    }
                }
            },
        },
        404: {
            "description": "Project not found",
            "content": {
                "application/json": {
                    "example": {
                        "erro": {
                            "codigo": "PROJETO_NAO_ENCONTRADO",
                            "mensagem": "Project 'xyz' not found",
                        }
                    }
                }
            },
        },
    },
)
@limiter.limit("20/minute")
async def obter_projeto(
    request: Request,
    projeto_id: str,
    obter_projeto_por_id_uc: Annotated[
        ObterProjetoPorIdUseCase,
        Depends(obter_obter_projeto_por_id_use_case),
    ],
) -> ProjetoDetalhado:
    """
    Obtém detalhes completos de um projeto.

    Args:
        projeto_id: ID do projeto a buscar.

    Returns:
        ProjetoDetalhado: Informações completas do projeto.

    Raises:
        ErroRecursoNaoEncontrado: Se projeto não existe.
    """
    projeto = await obter_projeto_por_id_uc.executar(projeto_id)

    if not projeto:
        raise ErroRecursoNaoEncontrado(
            mensagem=f"Projeto '{projeto_id}' não encontrado",
            codigo="PROJETO_NAO_ENCONTRADO",
        )

    return ProjetoDetalhado(
        id=projeto.id,
        nome=projeto.nome,
        descricao_curta=projeto.descricao_curta,
        descricao_completa=projeto.descricao_completa,
        tecnologias=projeto.tecnologias,
        funcionalidades=projeto.funcionalidades,
        aprendizados=projeto.aprendizados,
        repositorio=projeto.repositorio,
        demo=projeto.demo,
        destaque=projeto.destaque,
        imagem=projeto.imagem,
    )


@roteador.get(
    "/stack",
    response_model=RespostaStack,
    summary="Tech stack",
    description="Returns technologies organized by category.",
    responses={
        200: {"description": "Tech stack returned successfully"},
    },
)
async def obter_stack(
    obter_stack_uc: Annotated[
        ObterStackUseCase,
        Depends(obter_obter_stack_use_case),
    ],
) -> RespostaStack:
    """
    Obtém stack tecnológico organizado.

    Returns:
        RespostaStack: Tecnologias agrupadas por categoria.
    """
    por_categoria = await obter_stack_uc.executar()

    # Converter para ItemStack
    stack_completo = []
    por_categoria_validado: dict[str, list[ItemStack]] = {}

    for categoria, itens in por_categoria.items():
        itens_validados = [ItemStack(**item) for item in itens]
        por_categoria_validado[categoria] = itens_validados
        stack_completo.extend(itens_validados)

    return RespostaStack(
        stack=stack_completo,
        por_categoria=por_categoria_validado,
    )


@roteador.get(
    "/experiencias",
    response_model=RespostaExperiencias,
    summary="Professional experiences",
    description="Returns list of experiences ordered chronologically (current first).",
    responses={
        200: {"description": "Experiences list returned successfully"},
    },
)
async def listar_experiencias(
    obter_experiencias_uc: Annotated[
        ObterExperienciasUseCase,
        Depends(obter_obter_experiencias_use_case),
    ],
) -> RespostaExperiencias:
    """
    Lista experiências profissionais.

    Returns:
        RespostaExperiencias: Lista ordenada de experiências.

    Ordenação:
        Experiência atual primeiro, depois por data (mais recente primeiro).
    """
    experiencias = await obter_experiencias_uc.executar()

    experiencias_schema = [
        Experiencia(
            id=e.id,
            cargo=e.cargo,
            empresa=e.empresa,
            localizacao=e.localizacao,
            data_inicio=e.data_inicio,
            data_fim=e.data_fim,
            descricao=e.descricao,
            tecnologias=e.tecnologias,
            atual=e.atual,
        )
        for e in experiencias
    ]

    return RespostaExperiencias(
        experiencias=experiencias_schema,
        total=len(experiencias_schema),
    )


@roteador.get(
    "/formacao",
    response_model=RespostaFormacao,
    summary="Academic formations",
    description="Returns list of academic formations ordered chronologically (in progress first).",
    responses={
        200: {"description": "Formations list returned successfully"},
    },
)
async def listar_formacao(
    obter_formacao_uc: Annotated[
        ObterFormacaoUseCase,
        Depends(obter_obter_formacao_use_case),
    ],
) -> RespostaFormacao:
    """
    Lista formações acadêmicas.

    Returns:
        RespostaFormacao: Lista ordenada de formações.

    Ordenação:
        Formação em curso primeiro, depois por data (mais recente primeiro).
    """
    formacoes = await obter_formacao_uc.executar()

    formacoes_schema = [
        ItemFormacao(
            id=f.id,
            curso=f.curso,
            instituicao=f.instituicao,
            localizacao=f.localizacao,
            data_inicio=f.data_inicio,
            data_fim=f.data_fim,
            descricao=f.descricao,
            atual=f.atual,
        )
        for f in formacoes
    ]

    return RespostaFormacao(
        formacoes=formacoes_schema,
        total=len(formacoes_schema),
    )
