import aiosqlite
import os

import contextlib


def get_db_path() -> str:
    override = os.getenv("OPSPILOT_DB_PATH")
    if override:
        return override
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "opspilot.db")

@contextlib.asynccontextmanager
async def get_db():
    async with aiosqlite.connect(get_db_path()) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def init_db():
    async with get_db() as db:
        # Create approvals table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                tool_name TEXT NOT NULL,
                arguments TEXT,  -- JSON
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
                responded_at TIMESTAMP
            )
        """)
        
        # Create audit table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user TEXT,
                tool_name TEXT,
                arguments TEXT,
                result TEXT,
                risk_level TEXT
            )
        """)
        await db.commit()

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
