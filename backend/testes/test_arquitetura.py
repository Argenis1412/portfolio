import re
from pathlib import Path

# Configuração de caminhos
BASE_DIR = Path(__file__).parent.parent
APP_DIR = BASE_DIR / "app"


def get_imports_from_file(file_path):
    """Extrai todos os imports de um arquivo Python."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Procura por "import app..." e "from app..."
    imports = re.findall(
        r"^(?:import|from)\s+(app\.[a-zA-Z0-9_\.]+)", content, re.MULTILINE
    )

    # Procura por "import fastapi..." e "from fastapi..."
    third_party = re.findall(
        r"^(?:import|from)\s+(fastapi|pydantic|sqlalchemy|sqlmodel)",
        content,
        re.MULTILINE,
    )

    return set(imports), set(third_party)


def test_entidades_purity():
    """
    As entidades de domínio devem ser puras.
    Não podem importar de controladores, adaptadores ou casos de uso.
    Não podem ter dependências de frameworks externos (FastAPI, SQLModel, etc).
    """
    entidades_dir = APP_DIR / "entidades"
    for py_file in entidades_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        app_imports, ext_imports = get_imports_from_file(py_file)

        # Verificar imports internos (app.*)
        for imp in app_imports:
            # Entidades só podem importar de outras entidades ou do core
            if not imp.startswith("app.entidades") and not imp.startswith("app.core"):
                raise AssertionError(
                    f"Violação de Arquitetura: {py_file.name} importa {imp}"
                )

        # Verificar dependências externas proibidas
        proibidos = {"fastapi", "pydantic", "sqlalchemy", "sqlmodel"}
        for imp in ext_imports:
            if imp in proibidos:
                raise AssertionError(
                    f"Violação de PUREZA: {py_file.name} importa framework externo: {imp}"
                )


def test_casos_uso_decoupling():
    """
    Os casos de uso devem ser independentes de frameworks web.
    Não podem importar de controladores ou fastapi.
    """
    casos_uso_dir = APP_DIR / "casos_uso"
    for py_file in casos_uso_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        app_imports, ext_imports = get_imports_from_file(py_file)

        # Verificar se importa controladores
        for imp in app_imports:
            if imp.startswith("app.controladores"):
                raise AssertionError(
                    f"Violação de Arquitetura: Caso de Uso {py_file.name} importa Controlador {imp}"
                )

        # Verificar dependências web proibidas
        for imp in ext_imports:
            if imp == "fastapi":
                raise AssertionError(
                    f"Violação de Arquitetura: Caso de Uso {py_file.name} importa FastAPI"
                )


def test_project_structure_exists():
    """Verifica se a estrutura de pastas da Clean Architecture está correta."""
    pastas_obrigatorias = ["entidades", "casos_uso", "adaptadores", "controladores"]
    for pasta in pastas_obrigatorias:
        assert (APP_DIR / pasta).is_dir(), f"Pasta obrigatória ausente: {pasta}"
