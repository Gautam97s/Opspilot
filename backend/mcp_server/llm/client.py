import os
from .providers.ollama import OllamaProvider
from .providers.gemini import GeminiProvider
from .utils import format_messages

class LLMClient:
    def __init__(self, primary_provider="ollama", secondary_provider="gemini"):
        self.ollama = OllamaProvider()
        self.gemini = GeminiProvider()
        self.primary_provider = primary_provider
        self.secondary_provider = secondary_provider

    async def chat(self, messages: list, tools: list = None, model: str = None) -> dict:
        """
        Unified chat interface.
        If primary_provider is 'ollama', it tries llama3.2:3b, then mistral:7b.
        If both fail or secondary is selected, it uses gemini.
        """
        formatted_messages = format_messages(messages)
        
        if self.primary_provider == "ollama":
            # Attempt qwen2.5:7b
            target_model = model or "qwen2.5:7b"
            result = await self.ollama.chat(formatted_messages, model=target_model, tools=tools)
            
            if "error" in result:
                # Fallback to mistral:7b
                print(f"Ollama {target_model} failed, falling back to mistral:7b...")
                result = await self.ollama.chat(formatted_messages, model="mistral:7b", tools=tools)
                
                if "error" in result:
                    # Final fallback to Gemini
                    print("Ollama mistral:7b failed, falling back to Gemini...")
                    result = await self.gemini.chat(formatted_messages, tools=tools)
            return result
        
        elif self.primary_provider == "gemini":
            return await self.gemini.chat(formatted_messages, tools=tools)
        
        return {"error": f"Unknown provider: {self.primary_provider}"}

# Singleton instance for easy access
client = LLMClient()
async def chat(messages: list, tools: list = None, model: str = None) -> dict:
    return await client.chat(messages, tools=tools, model=model)
