"""
Script para migrar dados de arquivos JSON para o banco de dados SQL.
"""

import sys
import os
import json
from pathlib import Path
from datetime import date
from sqlmodel import SQLModel, create_engine, Session, text

# Adicionar o diretório backend ao sys.path
current_dir = Path(__file__).parent.absolute()
backend_dir = current_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from app.adaptadores.modelos_sql import (
    SobreModelo,
    ProjetoModelo,
    ExperienciaModelo,
    FormacaoModelo,
    StackModelo,
)
from app.configuracao import configuracoes

# Usar engine síncrona
DATABASE_URL_SYNC = configuracoes.database_url.replace("+aiosqlite", "")
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
        session.execute(text("DELETE FROM sobre"))
        session.execute(text("DELETE FROM projetos"))
        session.execute(text("DELETE FROM experiencias"))
        session.execute(text("DELETE FROM formacoes"))
        session.execute(text("DELETE FROM stack"))
        
        # 1. Seção Sobre
        sobre_dados = carregar_json("sobre.json")
        if sobre_dados:
            # Serialização manual
            if isinstance(sobre_dados.get("descricao"), (dict, list)):
                sobre_dados["descricao"] = json.dumps(sobre_dados["descricao"], ensure_ascii=False)
            if isinstance(sobre_dados.get("disponibilidade"), (dict, list)):
                sobre_dados["disponibilidade"] = json.dumps(sobre_dados["disponibilidade"], ensure_ascii=False)
            
            sobre = SobreModelo(**sobre_dados)
            session.add(sobre)
            print("✓ Dados da seção 'Sobre' migrados.")
        
        # 2. Projetos
        projetos_dados = carregar_json("projetos.json")
        if projetos_dados:
            for p in projetos_dados:
                for field in ["descricao_curta", "descricao_completa", "tecnologias", "funcionalidades", "aprendizados"]:
                    if field in p and isinstance(p[field], (dict, list)):
                        p[field] = json.dumps(p[field], ensure_ascii=False)
                projeto = ProjetoModelo(**p)
                session.add(projeto)
            print(f"✓ {len(projetos_dados)} projetos migrados.")
            
        # 3. Experiências Profissionais
        exp_dados = carregar_json("experiencias.json")
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
                
                exp = ExperienciaModelo(**e)
                session.add(exp)
            print(f"✓ {len(exp_dados)} experiências migradas.")
            
        # 4. Formação Acadêmica
        form_dados = carregar_json("formacao.json")
        if form_dados:
            for f in form_dados:
                f["data_inicio"] = date.fromisoformat(f["data_inicio"])
                if f.get("data_fim"):
                    f["data_fim"] = date.fromisoformat(f["data_fim"])
                
                # Serialização manual de campos complexos
                for field in ["curso", "descricao"]:
                    if field in f and isinstance(f[field], (dict, list)):
                        f[field] = json.dumps(f[field], ensure_ascii=False)
                
                form = FormacaoModelo(**f)
                session.add(form)
            print(f"✓ {len(form_dados)} itens de formação migrados.")
            
        # 5. Stack Tecnológico
        stack_dados = carregar_json("stack.json")
        if stack_dados:
            for s in stack_dados:
                stack = StackModelo(**s)
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
