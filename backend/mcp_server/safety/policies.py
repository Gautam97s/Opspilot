import os
import json

# Hardcoded risk levels for tools
# read_tools: always allowed
# destructive_tools: require approval
# file_access: path whitelist only

POLICIES = {
    "read_tools": ["ls", "cat", "grep", "find_by_name", "list_dir", "view_file", "view_file_outline", "view_code_item"],
    "destructive_tools": ["rm", "delete_file", "replace_file_content", "multi_replace_file_content", "write_to_file"],
    "file_access": {
        "whitelist": [
            "c:/Gautam/opspilot/backend/",
            "c:/Gautam/opspilot/frontend/",
            "c:/Gautam/opspilot/docs/"
        ]
    }
}

def check_policy(tool_name: str, arguments: dict) -> str:
    """
    Checks the policy for a given tool and arguments.
    Returns: 'allowed', 'needs_approval', or 'denied'.
    """
    # 1. Check if it's a known read tool
    if tool_name in POLICIES["read_tools"]:
        return "allowed"
    
    # 2. Check if it's a known destructive tool
    if tool_name in POLICIES["destructive_tools"]:
        return "needs_approval"
    
    # 3. Specific check for file access path whitelist
    # Assuming tools like 'write_to_file' or 'read_file' have a 'path' or 'TargetFile' argument
    path = arguments.get("path") or arguments.get("TargetFile") or arguments.get("AbsolutePath")
    if path:
        is_whitelisted = any(path.startswith(w) for w in POLICIES["file_access"]["whitelist"])
        if not is_whitelisted:
            return "denied"
    
    # Default to needs approval for unknown but potentially dangerous tools
    return "needs_approval"

def get_risk_level(tool_name: str) -> str:
    if tool_name in POLICIES["read_tools"]:
        return "low"
    if tool_name in POLICIES["destructive_tools"]:
        return "high"
    return "medium"
