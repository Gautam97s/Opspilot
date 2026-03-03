import pytest
from mcp_server.safety.policies import check_policy

def test_path_traversal_denied():
    # Attempting to access file outside whitelist
    args = {"AbsolutePath": "c:/Windows/System32/config/SAM"}
    result = check_policy("view_file", args)
    assert result == "denied"

def test_whitelisted_path_allowed():
    args = {"AbsolutePath": "c:/Gautam/opspilot/backend/server.py"}
    result = check_policy("view_file", args)
    assert result == "allowed"

def test_destructive_tool_needs_approval():
    args = {"TargetFile": "c:/Gautam/opspilot/backend/test.txt", "ReplacementContent": "data"}
    result = check_policy("write_to_file", args)
    assert result == "needs_approval"

def test_read_tool_allowed():
    result = check_policy("ls", {"path": "."})
    assert result == "allowed"
