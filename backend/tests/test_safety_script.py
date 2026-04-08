import asyncio
import json
from mcp_server.safety import check_policy, get_risk_level, create_request, get_pending, approve, reject, log_action, init_db

async def test_safety():
    print("--- Testing Safety System ---")
    await init_db()
    
    # 1. Test Policy Engine
    print("\n[Test 1] Policy Engine")
    tests = [
        ("ls", {"path": "c:/Gautam/opspilot/backend/"}),
        ("rm", {"path": "c:/Gautam/opspilot/backend/temp.txt"}),
        ("view_file", {"AbsolutePath": "c:/Gautam/secret.txt"}),
    ]
    for tool, args in tests:
        policy = check_policy(tool, args)
        risk = get_risk_level(tool)
        print(f"Tool: {tool}, Args: {args} -> Policy: {policy}, Risk: {risk}")

    # 2. Test Approval Queue
    print("\n[Test 2] Approval Queue")
    req_id = await create_request("rm", {"path": "c:/Gautam/opspilot/backend/temp.txt"})
    print(f"Created request: {req_id}")
    
    pending = await get_pending()
    print(f"Pending requests: {len(pending)}")
    
    await approve(req_id)
    print(f"Approved request: {req_id}")
    
    pending = await get_pending()
    print(f"Pending requests after approval: {len(pending)}")

    # 3. Test Audit Log
    print("\n[Test 3] Audit Log")
    await log_action("test_user", "ls", {"path": "/"}, "Success", "low")
    print("Logged action to audit table")

if __name__ == "__main__":
    asyncio.run(test_safety())
