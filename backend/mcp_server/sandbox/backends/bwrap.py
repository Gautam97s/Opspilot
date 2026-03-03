import asyncio
from typing import List

class BwrapBackend:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    async def run(self, cmd: List[str]) -> str:
        # bwrap --ro-bind / / --tmpfs /tmp --unshare-all <cmd>
        full_cmd = [
            "bwrap",
            "--ro-bind", "/", "/",
            "--tmpfs", "/tmp",
            "--unshare-all",
            *cmd
        ]
        try:
            process = await asyncio.create_subprocess_exec(
                *full_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self.timeout)
                if process.returncode != 0:
                    return f"Error: {stderr.decode().strip()}"
                return stdout.decode().strip()
            except asyncio.TimeoutError:
                process.kill()
                return "Error: Sandbox execution timed out after 10 seconds"
        except Exception as e:
            return f"Bwrap Error: {str(e)}"
