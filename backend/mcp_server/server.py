import asyncio
import json

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
import structlog

from mcp_server.core.schemas import (
    InitializeRequest, InitializeResult, JSONRPCResponse,
    ListToolsResult, Tool, CallToolRequest, CallToolResult, TextContent,
    Implementation, ServerCapabilities
)
from mcp_server.core.lifespan import lifespan
from mcp_server.tools.registry import registry
from mcp_server.safety import (
    approve,
    check_policy,
    create_request,
    get_pending,
    get_request,
    get_risk_level,
    log_action,
    reject,
)
# Import implementations to trigger registration
import mcp_server.tools.implementations.system_tools
import mcp_server.tools.implementations.file_tools
import mcp_server.tools.implementations.k8s_tools
import mcp_server.tools.implementations.docker_tools
import mcp_server.tools.implementations.git_tools

app = FastAPI(title="FastAPI MCP Server", lifespan=lifespan)
logger = structlog.get_logger()

# Mock Data
SERVER_INFO = Implementation(name="fastapi-mcp-server", version="0.1.0")
SERVER_CAPABILITIES = ServerCapabilities(
    tools={"listChanged": False},
    resources={"subscribe": False},
    prompts={"listChanged": False}
)

TOOLS = [
    Tool(
        name="get_weather",
        description="Get current weather for a city",
        inputSchema={
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    )
]

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/initialize", response_model=JSONRPCResponse)
async def initialize(request: InitializeRequest):
    logger.info("initialize_request", client_info=request.params.clientInfo.model_dump())
    
    result = InitializeResult(
        protocolVersion="2024-11-05",
        capabilities=SERVER_CAPABILITIES,
        serverInfo=SERVER_INFO
    )
    
    return JSONRPCResponse(id=request.id, result=result.model_dump())

@app.get("/tools/list", response_model=JSONRPCResponse)
async def list_tools():
    logger.info("list_tools_request")
    mcp_tools = [
        Tool(name=t.name, description=t.description, inputSchema=t.input_schema)
        for t in registry.list_tools()
    ]
    result = ListToolsResult(tools=mcp_tools)
    return JSONRPCResponse(result=result.model_dump())

@app.post("/tools/call", response_model=JSONRPCResponse)
async def call_tool(request: CallToolRequest):
    logger.info("call_tool_request", tool=request.params.name)
    return await _execute_tool_request(request.params.name, request.params.arguments or {}, request.id)


async def _execute_tool_request(tool_name: str, args: dict, request_id=None):
    tool_func = registry.get_tool(tool_name)
    if not tool_func:
        return JSONRPCResponse(
            id=request_id,
            error={"code": -32601, "message": f"Tool not found: {tool_name}"}
        )

    metadata = registry.get_tool_metadata(tool_name)
    risk = metadata.risk if metadata else None
    policy = check_policy(tool_name, args, risk=risk)
    risk_level = get_risk_level(tool_name, risk=risk)

    if policy == "denied":
        await log_action("api", tool_name, args, "denied_by_policy", risk_level)
        return JSONRPCResponse(
            id=request_id,
            error={"code": -32001, "message": f"Tool denied by policy: {tool_name}"}
        )

    if policy == "needs_approval":
        approval_id = await create_request(tool_name, args)
        await log_action("api", tool_name, args, f"approval_requested:{approval_id}", risk_level)
        result = CallToolResult(
            content=[TextContent(text=f"Approval required for `{tool_name}`. Request id: {approval_id}")],
            isError=True,
        )
        return JSONRPCResponse(id=request_id, result=result.model_dump())

    try:
        output = await tool_func(**args)
        await log_action("api", tool_name, args, str(output), risk_level)
        content = [TextContent(text=str(output))]
        result = CallToolResult(content=content)
        return JSONRPCResponse(id=request_id, result=result.model_dump())
    except Exception as e:
        logger.error("tool_execution_failed", tool=tool_name, error=str(e))
        await log_action("api", tool_name, args, f"error:{str(e)}", risk_level)
        return JSONRPCResponse(
            id=request_id,
            error={"code": -32000, "message": f"Tool execution failed: {str(e)}"}
        )


@app.get("/approvals/pending")
async def list_pending_approvals():
    rows = await get_pending()
    approvals = []
    for row in rows:
        approvals.append(
            {
                "id": row["id"],
                "tool_name": row["tool_name"],
                "arguments": json.loads(row["arguments"]) if row["arguments"] else {},
                "requested_at": row["requested_at"],
                "status": row["status"],
            }
        )
    return {"approvals": approvals}


@app.post("/approvals/{request_id}/approve")
async def approve_request(request_id: str):
    await approve(request_id)
    return {"status": "approved", "id": request_id}


@app.post("/approvals/{request_id}/reject")
async def reject_request(request_id: str):
    await reject(request_id)
    return {"status": "rejected", "id": request_id}


@app.post("/approvals/{request_id}/execute")
async def execute_approved_request(request_id: str):
    row = await get_request(request_id)
    if not row:
        return JSONResponse(status_code=404, content={"error": "Approval request not found", "id": request_id})
    if row["status"] != "approved":
        return JSONResponse(
            status_code=409,
            content={"error": f"Approval request is not approved (status: {row['status']})", "id": request_id},
        )

    tool_name = row["tool_name"]
    arguments = json.loads(row["arguments"]) if row["arguments"] else {}
    tool_func = registry.get_tool(tool_name)
    metadata = registry.get_tool_metadata(tool_name)
    if not tool_func:
        return JSONResponse(status_code=404, content={"error": f"Tool not found: {tool_name}", "id": request_id})

    risk = metadata.risk if metadata else None
    risk_level = get_risk_level(tool_name, risk=risk)
    try:
        output = await tool_func(**arguments)
        if isinstance(output, str) and output.startswith("Error:"):
            await log_action("api", tool_name, arguments, f"approved_execution_error:{output}", risk_level)
            return JSONResponse(
                status_code=500,
                content={"id": request_id, "status": "error", "tool_name": tool_name, "error": output},
            )
        await log_action("api", tool_name, arguments, f"approved_execution:{str(output)}", risk_level)
        return {
            "id": request_id,
            "status": "executed",
            "tool_name": tool_name,
            "result": str(output),
            "arguments": arguments,
        }
    except Exception as exc:
        logger.error("approved_tool_execution_failed", tool=tool_name, error=str(exc))
        await log_action("api", tool_name, arguments, f"approved_execution_error:{str(exc)}", risk_level)
        return JSONResponse(
            status_code=500,
            content={"id": request_id, "status": "error", "tool_name": tool_name, "error": str(exc)},
        )

@app.get("/sse")
async def sse_endpoint(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            yield {
                "event": "message",
                "data": '{"jsonrpc": "2.0", "method": "notifications/initialized"}'
            }
            await asyncio.sleep(10)

    return EventSourceResponse(event_generator())
