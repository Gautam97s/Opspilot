import httpx
import json

class OllamaProvider:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url

    async def chat(self, messages: list, model: str = "llama3.2:3b", tools: list = None) -> dict:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                message = data.get("message", {})
                content = message.get("content", "")
                tool_calls = message.get("tool_calls", [])
                
                return {
                    "content": content,
                    "tool_calls": tool_calls
                }
            except Exception as e:
                # Basic error handling; could be expanded
                return {"error": str(e)}
