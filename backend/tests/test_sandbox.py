import pytest
from unittest.mock import patch, MagicMock
from mcp_server.sandbox.executor import SandboxExecutor

@pytest.mark.asyncio
async def test_sandbox_selection_linux():
    with patch("platform.system", return_value="Linux"), \
         patch("shutil.which", side_effect=lambda x: x == "firejail"):
        executor = SandboxExecutor()
        from mcp_server.sandbox.backends.firejail import FirejailBackend
        assert isinstance(executor.backend, FirejailBackend)

@pytest.mark.asyncio
async def test_sandbox_selection_fallback():
    with patch("platform.system", return_value="Windows"):
        executor = SandboxExecutor()
        from mcp_server.sandbox.fallback import FallbackBackend
        assert isinstance(executor.backend, FallbackBackend)

@pytest.mark.asyncio
async def test_sandbox_run():
    executor = SandboxExecutor()
    with patch.object(executor.backend, "run", return_value="output") as mock_run:
        result = await executor.run(["ls"])
        assert result == "output"
        mock_run.assert_called_once_with(["ls"])
