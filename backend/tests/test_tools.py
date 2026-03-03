import pytest
from mcp_server.tools.registry import ToolRegistry
from mcp_server.tools.base import tool

def test_tool_registration(registry, sample_tool):
    registry.register_tool(sample_tool)
    assert "test_tool" in registry._tools
    metadata = registry.get_tool("test_tool")._mcp_tool
    assert metadata.name == "test_tool"
    assert metadata.description == "A test tool"
    assert metadata.risk == "read"

def test_schema_inference(registry):
    @tool(name="schema_test", description="Test schema", risk="read")
    async def schema_test(a: int, b: str, c: bool = True):
        return f"{a}, {b}, {c}"
    
    registry.register_tool(schema_test)
    metadata = registry.get_tool("schema_test")._mcp_tool
    schema = metadata.input_schema
    assert schema["type"] == "object"
    assert schema["properties"]["a"]["type"] == "integer"
    assert schema["properties"]["b"]["type"] == "string"
    assert schema["properties"]["c"]["type"] == "boolean"
    assert "a" in schema["required"]
    assert "b" in schema["required"]
    assert "c" not in schema["required"]

def test_invalid_tool_registration(registry):
    async def not_a_tool():
        pass
    
    with pytest.raises(ValueError, match="is not decorated with @tool"):
        registry.register_tool(not_a_tool)
