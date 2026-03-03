from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
import structlog
import asyncio

from mcp_server.schemas import (
    InitializeRequest, InitializeResult, JSONRPCResponse,
    ListToolsResult, Tool, CallToolRequest, CallToolResult, TextContent,
    Implementation, ServerCapabilities
)
from mcp_server.lifespan import lifespan
from mcp_server.tools.registry import registry
# Import implementations to trigger registration
import mcp_server.tools.implementations.system_tools
import mcp_server.tools.implementations.file_tools

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
    
    tool_func = registry.get_tool(request.params.name)
    if not tool_func:
        return JSONRPCResponse(
            id=request.id,
            error={"code": -32601, "message": f"Tool not found: {request.params.name}"}
        )
    
    try:
        # Call the tool function with provided arguments
        args = request.params.arguments or {}
        output = await tool_func(**args)
        
        content = [TextContent(text=str(output))]
        result = CallToolResult(content=content)
        return JSONRPCResponse(id=request.id, result=result.model_dump())
    except Exception as e:
        logger.error("tool_execution_failed", tool=request.params.name, error=str(e))
        return JSONRPCResponse(
            id=request.id,
            error={"code": -32000, "message": f"Tool execution failed: {str(e)}"}
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
