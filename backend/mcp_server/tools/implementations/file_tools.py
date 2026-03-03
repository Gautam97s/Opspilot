import os
import subprocess
import asyncio
from typing import Optional
from backend.mcp_server.tools.base import tool
from backend.mcp_server.tools.registry import registry

TIMEOUT = 5.0

def validate_path(path: str):
    """Basic path traversal and sensitive directory protection."""
    forbidden = ["..", "/etc", "/root", "C:\\Windows", "C:\\Users\\Default"]
    for item in forbidden:
        if item.lower() in path.lower():
            raise ValueError(f"Access denied: Path contains forbidden pattern '{item}'")

@tool(name="list_directory", description="List contents of a directory (Windows equivalent of ls -la)", risk="read")
async def list_directory(path: str = "."):
    try:
        validate_path(path)
        # Using dir /a for hidden/system files too
        process = await asyncio.create_subprocess_exec(
            "cmd", "/c", f"dir /a \"{path}\"",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=TIMEOUT)
        return stdout.decode().strip() if process.returncode == 0 else stderr.decode().strip()
    except Exception as e:
        return f"Error: {str(e)}"

@tool(name="read_file", description="Read content of a file (Windows equivalent of cat)", risk="read")
async def read_file(path: str):
    try:
        validate_path(path)
        if not os.path.isfile(path):
            return "Error: File not found or is a directory"
        
        # Using type command or just python open
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            # Limit read size for safety
            return f.read(10000) 
    except Exception as e:
        return f"Error: {str(e)}"

@tool(name="search_logs", description="Search for a pattern in logs (Windows equivalent of grep)", risk="read")
async def search_logs(pattern: str, log_file: str):
    try:
        validate_path(log_file)
        # findstr is the windows grep
        process = await asyncio.create_subprocess_exec(
            "findstr", pattern, log_file,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=TIMEOUT)
        return stdout.decode().strip() if process.returncode == 0 else "No matches found."
    except Exception as e:
        return f"Error: {str(e)}"

# Register tools
registry.register_tool(list_directory)
registry.register_tool(read_file)
registry.register_tool(search_logs)
