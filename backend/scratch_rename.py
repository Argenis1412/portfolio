import os

mappings = {
    "app.adaptadores": "app.adapters",
    "app.casos_uso": "app.use_cases",
    "app.controladores": "app.controllers",
    "app.esquemas": "app.schemas",
    "app.entidades": "app.entities",
    "app.core.idempotencia": "app.core.idempotency",
    "app.core.limite": "app.core.rate_limit",
    "email_adaptador": "email_adapter",
    "logger_adaptador": "logger_adapter",
    "modelos_sql": "sql_models",
    "repositorio_sql": "sql_repository",
    "repositorio": "repository",
    "experiencia": "experience",
    "formacao": "formation",
    "mensagem": "message",
    "projeto": "project",
    "projetos": "projects",
    "contato": "contact",
    "saude": "health",
    "sobre": "about",
    "enviar_contato": "send_contact",
    "obter_experiencias": "get_experiences",
    "obter_formacao": "get_formation",
    "obter_projetos": "get_projects",
    "obter_sobre": "get_about",
    "obter_stack": "get_stack",
    "dependencias": "dependencies",
    "mascarar_email": "mask_email",
    "enviar_mensagem": "send_message",
    "verificar_saude": "check_health",
    "roteador": "router",
    "roteador_v1": "router_v1",
    "RepositorioPortfolio": "PortfolioRepository",
    "RepositorioJSON": "JsonRepository",
    "RepositorioSQL": "SqlRepository",
    "EmailAdaptador": "EmailAdapter",
    "FormspreeEmailAdaptador": "FormspreeEmailAdapter",
    "ResendEmailAdaptador": "ResendEmailAdapter",
    "LoggerAdaptador": "LoggerAdapter",
    "ExperienciaProfissional": "ProfessionalExperience",
    "FormacaoAcademica": "AcademicFormation",
    "Projeto": "Project",
    "Mensagem": "Message",
    "RespostaSobre": "AboutResponse",
    "RespostaSaude": "HealthResponse",
    "RespostaProjetos": "ProjectsResponse",
    "RespostaStack": "StackResponse",
    "RespostaExperiencias": "ExperiencesResponse",
    "RespostaFormacao": "FormationResponse",
    "RequisicaoContato": "ContactRequest",
    "RespostaContato": "ContactResponse",
    "ProjetoModelo": "ProjectModel",
    "SobreModelo": "AboutModel",
    "StackModelo": "StackModel",
    "ExperienciaModelo": "ExperienceModel",
    "FormacaoModelo": "FormationModel",
    "ProjectModelo": "ProjectModel",
    "AboutModelo": "AboutModel",
    "ExperienceModelo": "ExperienceModel",
    "FormationModelo": "FormationModel",
    "ObterSobreUseCase": "GetAboutUseCase",
    "ObterProjetosUseCase": "GetProjectsUseCase",
    "ObterProjetoPorIdUseCase": "GetProjectByIdUseCase",
    "ObterStackUseCase": "GetStackUseCase",
    "ObterExperienciasUseCase": "GetExperiencesUseCase",
    "ObterFormacaoUseCase": "GetFormationUseCase",
    "EnviarContatoUseCase": "SendContactUseCase",
    "ObterProjectsUseCase": "GetProjectsUseCase",
    "ObterProjectPorIdUseCase": "GetProjectByIdUseCase",
    "registrar_handlers_excecao": "register_exception_handlers",
    "resposta_cacheavel": "cacheable_response",
    "gerar_etag": "generate_etag",
    "tipos_base": "base_types",
    "TextoLocalizado": "LocalizedText",
    "settings.ambiente": "settings.environment",
    "settings.nome_app": "settings.app_name",
    "settings.is_producao": "settings.is_production",
    "settings.validate_producao": "settings.validate_production",
    "obter_repositorio": "get_repository",
    "obter_enviar_contato_use_case": "get_send_contact_use_case",
    "obter_send_contact_use_case": "get_send_contact_use_case",
    "obter_get_about": "get_about",
    "obter_get_projects": "get_projects",
    "obter_get_project_by_id": "get_project_by_id",
    "obter_get_stack": "get_stack",
    "obter_get_experiences": "get_experiences",
    "obter_get_formation": "get_formation",
    "Configuracoes": "Settings",
    "configuracoes": "settings",
    "app.configuracao": "app.settings",
    "validar_producao": "validate_production",
}

def replace_in_file(file_path):
    if "scratch_rename.py" in file_path:
        return
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content
    for old in sorted(mappings.keys(), key=len, reverse=True):
        new = mappings[old]
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def walk_and_replace(directory):
    for root, dirs, files in os.walk(directory):
        if ".venv" in root or ".git" in root or "__pycache__" in root or ".mypy_cache" in root:
            continue
        for file in files:
            if file.endswith(".py") or file.endswith(".json") or file.endswith(".ini") or file.endswith(".md"):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    walk_and_replace(".")
