from pathlib import Path
from typing import Any, Iterable, Optional

# Hardcoded risk levels for tools
# read_tools: always allowed
# destructive_tools: require approval
# file_access: path whitelist only

PROJECT_ROOT = Path(__file__).resolve().parents[3]
WHITELIST_PATHS = [
    (PROJECT_ROOT / "backend").as_posix().lower() + "/",
    (PROJECT_ROOT / "frontend").as_posix().lower() + "/",
    (PROJECT_ROOT / "docs").as_posix().lower() + "/",
    (PROJECT_ROOT / "backend" / "repos").as_posix().lower() + "/",
]


POLICIES = {
    "read_tools": ["ls", "cat", "grep", "find_by_name", "list_dir", "view_file", "view_file_outline", "view_code_item"],
    "destructive_tools": ["rm", "delete_file", "replace_file_content", "multi_replace_file_content", "write_to_file"],
    "file_access": {
        "whitelist": WHITELIST_PATHS
    }
}

FILE_ARGUMENT_KEYS = ("path", "TargetFile", "AbsolutePath", "log_file")


def _normalize_path(path: str) -> str:
    return str(path).replace("\\", "/").lower()


def _is_absolute_path(path: str) -> bool:
    normalized = _normalize_path(path)
    return normalized.startswith("/") or (len(normalized) >= 3 and normalized[1] == ":" and normalized[2] == "/")


def _is_whitelisted(path: str, whitelist: Iterable[str]) -> bool:
    normalized = _normalize_path(path)
    return any(normalized.startswith(_normalize_path(prefix)) for prefix in whitelist)


def _extract_path(arguments: dict[str, Any]) -> Optional[str]:
    for key in FILE_ARGUMENT_KEYS:
        value = arguments.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def check_policy(tool_name: str, arguments: dict, risk: Optional[str] = None) -> str:
    """
    Checks the policy for a given tool and arguments.
    Returns: 'allowed', 'needs_approval', or 'denied'.
    """
    path = _extract_path(arguments)
    if path and _is_absolute_path(path):
        if not _is_whitelisted(path, POLICIES["file_access"]["whitelist"]):
            return "denied"

    if risk == "read":
        return "allowed"
    if risk in {"operational", "destructive"}:
        return "needs_approval"

    # 1. Known read tools are allowed, but we still enforce whitelist for
    # absolute-path file access (e.g. view_file) to prevent exfiltration.
    if tool_name in POLICIES["read_tools"]:
        return "allowed"
    
    # 2. Known destructive tools require approval (and can be denied if outside whitelist)
    if tool_name in POLICIES["destructive_tools"]:
        return "needs_approval"
    
    # Default to needs approval for unknown but potentially dangerous tools
    return "needs_approval"

def get_risk_level(tool_name: str, risk: Optional[str] = None) -> str:
    if risk == "read":
        return "low"
    if risk == "operational":
        return "medium"
    if risk == "destructive":
        return "high"
    if tool_name in POLICIES["read_tools"]:
        return "low"
    if tool_name in POLICIES["destructive_tools"]:
        return "high"
    return "medium"
