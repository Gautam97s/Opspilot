from typing import Annotated, Any, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, RootModel

# JSON-RPC 2.0 Base Structures
class JSONRPCBase(BaseModel):
    model_config = ConfigDict(strict=True)

class JSONRPCRequest(JSONRPCBase):
    jsonrpc: Literal["2.0"] = "2.0"
    method: str
    params: Optional[Union[dict[str, Any], list[Any]]] = None
    id: Optional[Union[str, int]] = None

class JSONRPCResponse(JSONRPCBase):
    jsonrpc: Literal["2.0"] = "2.0"
    result: Optional[Any] = None
    error: Optional[dict[str, Any]] = None
    id: Optional[Union[str, int]] = None

# MCP Implementation Detail
class Implementation(BaseModel):
    name: str
    version: str

# Server Capabilities
class ServerCapabilities(BaseModel):
    tools: Optional[dict[str, Any]] = None
    resources: Optional[dict[str, Any]] = None
    prompts: Optional[dict[str, Any]] = None

# Initialize Request
class InitializeParams(BaseModel):
    protocolVersion: str
    capabilities: dict[str, Any]
    clientInfo: Implementation

class InitializeRequest(JSONRPCRequest):
    method: Literal["initialize"] = "initialize"
    params: InitializeParams

class InitializeResult(BaseModel):
    protocolVersion: str
    capabilities: ServerCapabilities
    serverInfo: Implementation

# Tool Definition
class Tool(BaseModel):
    name: str
    description: Optional[str] = None
    inputSchema: dict[str, Any]

# List Tools
class ListToolsResult(BaseModel):
    tools: list[Tool]

# Call Tool
class CallToolParams(BaseModel):
    name: str
    arguments: Optional[dict[str, Any]] = None

class CallToolRequest(JSONRPCRequest):
    method: Literal["tools/call"] = "tools/call"
    params: CallToolParams

class TextContent(BaseModel):
    type: Literal["text"] = "text"
    text: str

class CallToolResult(BaseModel):
    content: list[TextContent]
    isError: bool = False
