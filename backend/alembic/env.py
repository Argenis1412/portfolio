from logging.config import fileConfig
import sys
from pathlib import Path

# Adicionar o diretório backend ao sys.path para que as importações do 'app' funcionem
backend_path = str(Path(__file__).parent.parent.absolute())
if backend_path not in sys.path:
    sys.path.append(backend_path)

import asyncio  # noqa: E402
from sqlalchemy import pool  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402
from alembic import context  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

# Importar modelos para que sejam registrados no SQLModel.metadata
from app.adaptadores.modelos_sql import (  # noqa: E402
    SobreModelo,  # noqa: F401
    ProjetoModelo,  # noqa: F401
    ExperienciaModelo,  # noqa: F401
    FormacaoModelo,  # noqa: F401
    StackModelo,  # noqa: F401
)
from app.configuracao import configuracoes  # noqa: E402

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Sobrescrever a URL do banco com a das configurações da aplicación
config.set_main_option("sqlalchemy.url", configuracoes.database_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = create_async_engine(
        config.get_main_option("sqlalchemy.url"),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Detectar si la URL es asíncrona (como en Koyeb o local SQLite)
    url = config.get_main_option("sqlalchemy.url")
    is_async = "+aiosqlite" in url or "+asyncpg" in url

    if is_async:
        asyncio.run(run_async_migrations())
    else:
        # Modo síncrono tradicional
        from sqlalchemy import engine_from_config

        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
