import json
from .database import get_db

async def log_action(user: str, tool_name: str, arguments: dict, result: str, risk_level: str):
    async with get_db() as db:
        await db.execute(
            "INSERT INTO audit (user, tool_name, arguments, result, risk_level) VALUES (?, ?, ?, ?, ?)",
            (user, tool_name, json.dumps(arguments), result, risk_level)
        )
        await db.commit()
