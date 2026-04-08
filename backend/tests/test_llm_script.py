import asyncio
from mcp_server.llm import chat

async def test_chat():
    print("--- Testing LLM Chat ---")
    messages = [
        {"role": "user", "content": "Hello, how are you?"}
    ]
    
    # Test without tools
    print("\n[Test 1] Basic Chat (No Tools)")
    result = await chat(messages)
    print(f"Result: {result}")

    # Test with tools
    print("\n[Test 2] Chat with Tools")
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather in a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The city and state, e.g. San Francisco, CA"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
    ]
    messages.append({"role": "user", "content": "What's the weather like in New York?"})
    result = await chat(messages, tools=tools)
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(test_chat())
