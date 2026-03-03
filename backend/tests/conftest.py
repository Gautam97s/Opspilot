import pytest
import asyncio
from unittest.mock import AsyncMock
from mcp_server.tools.registry import ToolRegistry
from mcp_server.tools.base import tool

@pytest.fixture
def registry():
    return ToolRegistry()

@pytest.fixture
def mock_llm():
    mock = AsyncMock()
    mock.chat.return_value = {"content": "Hello! I am a mocked LLM."}
    return mock

@pytest.fixture
def sample_tool():
    @tool(name="test_tool", description="A test tool", risk="read")
    async def test_tool(arg1: str):
        return f"Result: {arg1}"
    return test_tool
