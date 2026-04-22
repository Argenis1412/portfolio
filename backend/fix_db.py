import asyncio
from app.adapters.sql_repository import SqlRepository
from app.adapters.sql_models import SQLModel


async def init_db():
    repo = SqlRepository()
    async with repo.engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(init_db())
