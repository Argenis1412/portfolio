import re
from pathlib import Path

# Path configuration
BASE_DIR = Path(__file__).parent.parent
APP_DIR = BASE_DIR / "app"


def get_imports_from_file(file_path):
    """Extracts all imports from a Python file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Look for "import app..." and "from app..."
    imports = re.findall(
        r"^(?:import|from)\s+(app\.[a-zA-Z0-9_\.]+)", content, re.MULTILINE
    )

    # Look for "import fastapi..." and "from fastapi..."
    third_party = re.findall(
        r"^(?:import|from)\s+(fastapi|pydantic|sqlalchemy|sqlmodel)",
        content,
        re.MULTILINE,
    )

    return set(imports), set(third_party)


def test_entities_purity():
    """
    Domain entities must be pure.
    They cannot import from controllers, adapters, or use cases.
    They cannot have dependencies on external frameworks (FastAPI, SQLModel, etc).
    """
    entities_dir = APP_DIR / "entities"
    for py_file in entities_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        app_imports, ext_imports = get_imports_from_file(py_file)

        # Verify internal imports (app.*)
        for imp in app_imports:
            # Entities can only import from other entities or core
            if not imp.startswith("app.entities") and not imp.startswith("app.core"):
                raise AssertionError(
                    f"Architecture Violation: {py_file.name} imports {imp}"
                )

        # Verify forbidden external dependencies
        forbidden = {"fastapi", "pydantic", "sqlalchemy", "sqlmodel"}
        for imp in ext_imports:
            if imp in forbidden:
                raise AssertionError(
                    f"PURITY Violation: {py_file.name} imports external framework: {imp}"
                )


def test_use_cases_decoupling():
    """
    Use cases must be independent of web frameworks.
    They cannot import from controllers or fastapi.
    """
    use_cases_dir = APP_DIR / "use_cases"
    for py_file in use_cases_dir.glob("*.py"):
        if py_file.name == "__init__.py":
            continue

        app_imports, ext_imports = get_imports_from_file(py_file)

        # Verify if it imports controllers
        for imp in app_imports:
            if imp.startswith("app.controllers"):
                raise AssertionError(
                    f"Architecture Violation: Use Case {py_file.name} imports Controller {imp}"
                )

        # Verify forbidden web dependencies
        for imp in ext_imports:
            if imp == "fastapi":
                raise AssertionError(
                    f"Architecture Violation: Use Case {py_file.name} imports FastAPI"
                )


def test_project_structure_exists():
    """Verifies if the Clean Architecture folder structure is correct."""
    required_folders = ["entities", "use_cases", "adapters", "controllers"]
    for folder in required_folders:
        assert (APP_DIR / folder).is_dir(), f"Required folder missing: {folder}"
