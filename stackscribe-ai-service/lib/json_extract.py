"""JSON extraction helper for LLM outputs"""

def extract_json_array(text: str) -> str:
    """Best-effort: extract the first top-level JSON array from model output."""
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and start < end:
        return text[start:end+1]
    return "[]"

def extract_json_object(text: str) -> str:
    """Best-effort: extract the first top-level JSON object from model output."""
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and start < end:
        return text[start:end+1]
    return ""
