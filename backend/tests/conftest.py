import pytest
import asyncio
from unittest.mock import AsyncMock
import os
import sys

# Make `backend/mcp_server` importable as top-level `mcp_server` in tests.
# Tests are executed from repo root in CI/dev, so we add `backend/` to sys.path.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

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


@pytest.fixture(autouse=True)
def isolated_test_db(tmp_path, monkeypatch):
    monkeypatch.setenv("OPSPILOT_DB_PATH", str(tmp_path / "opspilot-test.db"))
