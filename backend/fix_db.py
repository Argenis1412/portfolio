import asyncio
from app.adaptadores.repositorio_sql import RepositorioSQL
from app.adaptadores.modelos_sql import SQLModel

async def init_db():
    repo = RepositorioSQL()
    async with repo.engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_db())
