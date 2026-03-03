import os
import google.generativeai as genai
from typing import List, Optional

class GeminiProvider:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)

    async def chat(self, messages: list, model: str = "gemini-1.5-flash", tools: list = None) -> dict:
        if not self.api_key:
            return {"error": "GOOGLE_API_KEY not found in environment"}

        try:
            # Convert messages to Gemini format
            # Gemini expects 'user' and 'model' roles
            gemini_messages = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                gemini_messages.append({"role": role, "parts": [msg["content"]]})

            # Handle tools if provided
            # Gemini tool calling requires a bit more setup with genai.GenerativeModel
            # For simplicity in this initial implementation, we'll assume tools are passed correctly
            model_instance = genai.GenerativeModel(model_name=model, tools=tools)
            
            # Start a chat session or send a single message
            # For a 'chat' interface, we can use start_chat(history=...)
            chat_session = model_instance.start_chat(history=gemini_messages[:-1])
            response = await chat_session.send_message_async(gemini_messages[-1]["parts"][0])
            
            # Extract content and tool calls
            content = response.text
            tool_calls = []
            if response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        tool_calls.append({
                            "function": {
                                "name": part.function_call.name,
                                "arguments": json.dumps(dict(part.function_call.args))
                            }
                        })

            return {
                "content": content,
                "tool_calls": tool_calls
            }
        except Exception as e:
            return {"error": str(e)}
