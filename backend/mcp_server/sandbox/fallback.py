import asyncio
from typing import List

class FallbackBackend:
    def __init__(self, timeout: int = 10):
        self.timeout = timeout

    async def run(self, cmd: List[str]) -> str:
        """Secure subprocess execution for non-Linux or non-sandbox environments."""
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self.timeout)
                if process.returncode != 0:
                    return f"Error: {stderr.decode().strip()}"
                return stdout.decode().strip()
            except asyncio.TimeoutError:
                # Ensure process group is killed if possible (simplified here)
                try:
                    process.kill()
                except:
                    pass
                return f"Error: Execution timed out after {self.timeout} seconds"
        except Exception as e:
            return f"Execution Error: {str(e)}"
