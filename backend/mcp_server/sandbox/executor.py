import os
import platform
import shutil
from typing import List
from backend.mcp_server.sandbox.backends.firejail import FirejailBackend
from backend.mcp_server.sandbox.backends.bwrap import BwrapBackend
from backend.mcp_server.sandbox.fallback import FallbackBackend

class SandboxExecutor:
    def __init__(self):
        self.timeout = 10
        self.backend = self._select_backend()

    def _select_backend(self):
        if platform.system() == "Linux":
            if shutil.which("firejail"):
                return FirejailBackend(timeout=self.timeout)
            if shutil.which("bwrap"):
                return BwrapBackend(timeout=self.timeout)
        
        return FallbackBackend(timeout=self.timeout)

    async def run(self, cmd: List[str]) -> str:
        return await self.backend.run(cmd)

executor = SandboxExecutor()
