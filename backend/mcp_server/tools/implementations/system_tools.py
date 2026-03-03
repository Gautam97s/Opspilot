import subprocess
import asyncio
from typing import Dict, Any
from mcp_server.tools.base import tool
from mcp_server.tools.registry import registry

TIMEOUT = 5.0

async def run_command(args: list[str]) -> str:
    """Executes a command safely with a timeout."""
    try:
        # Use asyncio.create_subprocess_exec for non-blocking execution
        process = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=TIMEOUT)
            if process.returncode != 0:
                return f"Error: {stderr.decode().strip()}"
            return stdout.decode().strip()
        except asyncio.TimeoutError:
            process.kill()
            return "Error: Command timed out after 5 seconds"
    except Exception as e:
        return f"Error: {str(e)}"

@tool(name="list_local_processes", description="List running processes (Windows equivalent of ps aux)", risk="read")
async def list_local_processes():
    return await run_command(["tasklist"])

@tool(name="get_disk_usage", description="Get disk usage information (Windows equivalent of df -h)", risk="read")
async def get_disk_usage():
    # WMIC is often available on Windows for this
    return await run_command(["wmic", "logicaldisk", "get", "caption,size,freespace"])

@tool(name="get_system_info", description="Get system information (Windows equivalent of uname/uptime)", risk="read")
async def get_system_info():
    return await run_command(["systeminfo"])

@tool(name="check_port", description="List active network connections and ports (Windows equivalent of netstat)", risk="read")
async def check_port():
    return await run_command(["netstat", "-ano"])

# Register tools
registry.register_tool(list_local_processes)
registry.register_tool(get_disk_usage)
registry.register_tool(get_system_info)
registry.register_tool(check_port)
