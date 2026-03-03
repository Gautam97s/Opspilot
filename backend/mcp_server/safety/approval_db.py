import datetime
import json
import uuid
import asyncio
from .database import get_db

async def create_request(tool_name: str, arguments: dict):
    request_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO approvals (id, tool_name, arguments, status) VALUES (?, ?, ?, 'pending')",
            (request_id, tool_name, json.dumps(arguments))
        )
        await db.commit()
    return request_id

async def get_pending():
    async with get_db() as db:
        async with db.execute("SELECT * FROM approvals WHERE status = 'pending'") as cursor:
            return await cursor.fetchall()

async def approve(request_id: str):
    async with get_db() as db:
        await db.execute(
            "UPDATE approvals SET status = 'approved', responded_at = CURRENT_TIMESTAMP WHERE id = ?",
            (request_id,)
        )
        await db.commit()

async def reject(request_id: str):
    async with get_db() as db:
        await db.execute(
            "UPDATE approvals SET status = 'rejected', responded_at = CURRENT_TIMESTAMP WHERE id = ?",
            (request_id,)
        )
        await db.commit()

async def cleanup_expired():
    """Background task to expire requests after 30 minutes."""
    while True:
        async with get_db() as db:
            await db.execute(
                "UPDATE approvals SET status = 'expired' WHERE status = 'pending' AND "
                "datetime(requested_at) < datetime('now', '-30 minutes')"
            )
            await db.commit()
        await asyncio.sleep(600)  # Check every 10 minutes
