def format_messages(messages: list) -> list:
    """
    Standardizes message formatting across different providers.
    Ensures that each message has a 'role' and 'content' key.
    """
    formatted = []
    for msg in messages:
        if isinstance(msg, dict):
            formatted.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        else:
            # Handle potential string-only messages
            formatted.append({
                "role": "user",
                "content": str(msg)
            })
    return formatted

def format_tool_calls(tool_calls) -> list:
    """
    Standardizes tool call output across different providers.
    """
    if not tool_calls:
        return []
    
    formatted = []
    for tc in tool_calls:
        # This will be refined based on provider-specific formats
        formatted.append(tc)
    return formatted
