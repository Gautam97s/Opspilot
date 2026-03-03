from typing import Any, Callable, Optional, Literal
import functools
import inspect
from pydantic import BaseModel

class ToolMetadata(BaseModel):
    name: str
    description: str
    risk: Literal["read", "operational", "destructive"]
    input_schema: dict[str, Any]

def tool(name: str, description: str, risk: Literal["read", "operational", "destructive"]):
    """Decorator to register a function as an MCP tool."""
    def decorator(func: Callable):
        # Infer schema from type hints if possible, or use a default
        # For simplicity in this implementation, we'll expect the docstring or metadata
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        
        wrapper._mcp_tool = ToolMetadata(
            name=name,
            description=description,
            risk=risk,
            input_schema={} # Will be populated by registry or manually
        )
        return wrapper
    return decorator
