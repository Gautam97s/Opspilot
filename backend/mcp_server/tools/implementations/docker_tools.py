import asyncio
import shutil
from typing import List

from mcp_server.tools.base import tool
from mcp_server.tools.registry import registry


TIMEOUT = 15.0


async def _run(cmd: List[str]) -> str:
    if not cmd:
        return "Error: empty command"

    exe = cmd[0]
    if shutil.which(exe) is None:
        return f"Error: '{exe}' not found in PATH"

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=TIMEOUT)
        except asyncio.TimeoutError:
            proc.kill()
            return f"Error: command timed out after {TIMEOUT:.0f}s"

        out = stdout.decode(errors="replace").strip()
        err = stderr.decode(errors="replace").strip()

        if proc.returncode != 0:
            return f"Error: {err or out or f'docker exited with {proc.returncode}'}"

        return out
    except Exception as e:
        return f"Error: {str(e)}"


@tool(
    name="docker_ps",
    description="List Docker containers (docker ps / docker ps -a)",
    risk="read",
)
async def docker_ps(all: bool = False):
    cmd = ["docker", "ps"]
    if all:
        cmd.append("-a")
    return await _run(cmd)


@tool(
    name="docker_images",
    description="List Docker images (docker images)",
    risk="read",
)
async def docker_images():
    return await _run(["docker", "images"])


@tool(
    name="docker_logs",
    description="Get container logs (docker logs --tail=N)",
    risk="read",
)
async def docker_logs(container: str, tail_lines: int = 200):
    return await _run(["docker", "logs", "--tail", str(tail_lines), container])


@tool(
    name="docker_inspect",
    description="Inspect a container/image (docker inspect)",
    risk="read",
)
async def docker_inspect(target: str):
    return await _run(["docker", "inspect", target])


# Register tools
registry.register_tool(docker_ps)
registry.register_tool(docker_images)
registry.register_tool(docker_logs)
registry.register_tool(docker_inspect)

