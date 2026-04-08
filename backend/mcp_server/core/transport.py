import json
from typing import Any
from fastapi import Request
from sse_starlette.sse import EventSourceResponse

async def send_mcp_event(data: Any):
    """Formats data as an SSE event for MCP."""
    return {
        "event": "message",
        "data": json.dumps(data)
    }

class MCPTransport:
    @staticmethod
    def format_sse(data: Any) -> str:
        return f"data: {json.dumps(data)}\n\n"
