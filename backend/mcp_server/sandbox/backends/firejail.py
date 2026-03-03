import asyncio
import os
import signal
from typing import List, Optional

class FirejailBackend:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    async def run(self, cmd: List[str]) -> str:
        # firejail --noprofile --private --net=none --timeout=10 <cmd>
        full_cmd = [
            "firejail",
            "--noprofile",
            "--private",
            "--net=none",
            f"--timeout={self.timeout}",
            *cmd
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *full_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                return f"Error: {stderr.decode().strip()}"
            return stdout.decode().strip()
        except Exception as e:
            return f"Firejail Error: {str(e)}"
