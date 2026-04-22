"""
Script para migrar dados de arquivos JSON para o banco de dados SQL.
"""

import json
import sys
from datetime import date
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine, text

# Adicionar o diretório backend ao sys.path
current_dir = Path(__file__).parent.absolute()
backend_dir = current_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from app.adapters.sql_models import (  # noqa: E402
    ExperienceModel,
    FormationModel,
    ProjectModel,
    AboutModel,
    StackModel,
)
from app.settings import settings  # noqa: E402

# Usar engine síncrona
DATABASE_URL_SYNC = settings.database_url.replace("+aiosqlite", "")
engine = create_engine(DATABASE_URL_SYNC)

DADOS_PATH = backend_dir / "dados"


def carregar_json(nome: str):
    caminho = DADOS_PATH / nome
    if not caminho.exists():
        print(f"Aviso: Arquivo {nome} não encontrado em {DADOS_PATH}")
        return None
    with open(caminho, "r", encoding="utf-8") as f:
        return json.load(f)


def migrar():
    """Executa a migração de dados com serialização JSON manual em todos os campos complexos."""
    print(f"--- Iniciando Migração para {DATABASE_URL_SYNC} ---")

    # Criar tabelas se não existirem
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Limpar dados existentes
        session.execute(text("DELETE FROM about"))
        session.execute(text("DELETE FROM projects"))
        session.execute(text("DELETE FROM experiences"))
        session.execute(text("DELETE FROM formacoes"))
        session.execute(text("DELETE FROM stack"))

        # 1. Seção Sobre
        about_dados = carregar_json("about.json")
        if about_dados:
            # Serialização manual
            if isinstance(about_dados.get("descricao"), (dict, list)):
                about_dados["descricao"] = json.dumps(
                    about_dados["descricao"], ensure_ascii=False
                )
            if isinstance(about_dados.get("disponibilidade"), (dict, list)):
                about_dados["disponibilidade"] = json.dumps(
                    about_dados["disponibilidade"], ensure_ascii=False
                )

            about = AboutModel(**about_dados)
            session.add(about)
            print("✓ Dados da seção 'Sobre' migrados.")

        # 2. Projects
        projects_dados = carregar_json("projects.json")
        if projects_dados:
            for p in projects_dados:
                for field in [
                    "descricao_curta",
                    "descricao_completa",
                    "tecnologias",
                    "funcionalidades",
                    "aprendizados",
                ]:
                    if field in p and isinstance(p[field], (dict, list)):
                        p[field] = json.dumps(p[field], ensure_ascii=False)
                project = ProjectModel(**p)
                session.add(project)
            print(f"✓ {len(projects_dados)} projects migrados.")

        # 3. Experiências Profissionais
        exp_dados = carregar_json("experiences.json")
        if exp_dados:
            for e in exp_dados:
                # Datas
                e["data_inicio"] = date.fromisoformat(e["data_inicio"])
                if e.get("data_fim"):
                    e["data_fim"] = date.fromisoformat(e["data_fim"])

                # Serialização manual de campos complexos
                for field in ["cargo", "descricao", "tecnologias"]:
                    if field in e and isinstance(e[field], (dict, list)):
                        e[field] = json.dumps(e[field], ensure_ascii=False)

                exp = ExperienceModel(**e)
                session.add(exp)
            print(f"✓ {len(exp_dados)} experiências migradas.")

        # 4. Formação Acadêmica
        form_dados = carregar_json("formation.json")
        if form_dados:
            for f in form_dados:
                f["data_inicio"] = date.fromisoformat(f["data_inicio"])
                if f.get("data_fim"):
                    f["data_fim"] = date.fromisoformat(f["data_fim"])

                # Serialização manual de campos complexos
                for field in ["curso", "descricao"]:
                    if field in f and isinstance(f[field], (dict, list)):
                        f[field] = json.dumps(f[field], ensure_ascii=False)

                form = FormationModel(**f)
                session.add(form)
            print(f"✓ {len(form_dados)} itens de formação migrados.")

        # 5. Stack Tecnológico
        stack_dados = carregar_json("stack.json")
        if stack_dados:
            for s in stack_dados:
                stack = StackModel(**s)
                session.add(stack)
            print(f"✓ {len(stack_dados)} tecnologias do stack migradas.")

        session.commit()

    print("\n--- Migração concluída com sucesso! ---")


if __name__ == "__main__":
    try:
        migrar()
    except Exception as e:
        print(f"\n❌ Erro durante a migração: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
