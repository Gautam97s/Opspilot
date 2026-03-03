import inspect
from typing import Any, Callable, Dict, List
from backend.mcp_server.tools.base import ToolMetadata

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}

    def register_tool(self, func: Callable):
        if not hasattr(func, "_mcp_tool"):
            raise ValueError(f"Function {func.__name__} is not decorated with @tool")
        
        metadata: ToolMetadata = func._mcp_tool
        
        # Simple schema inference from signature
        sig = inspect.signature(func)
        properties = {}
        required = []
        
        for name, param in sig.parameters.items():
            param_type = "string" # Default
            if param.annotation == int:
                param_type = "integer"
            elif param.annotation == bool:
                param_type = "boolean"
            
            properties[name] = {"type": param_type}
            if param.default is inspect.Parameter.empty:
                required.append(name)
        
        metadata.input_schema = {
            "type": "object",
            "properties": properties,
            "required": required
        }
        
        self._tools[metadata.name] = func

    def get_tool(self, name: str) -> Optional[Callable]:
        return self._tools.get(name)

    def list_tools(self) -> List[ToolMetadata]:
        return [func._mcp_tool for func in self._tools.values()]

registry = ToolRegistry()
