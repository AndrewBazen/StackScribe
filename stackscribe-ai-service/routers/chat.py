from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from settings import REQ_LLM_BASE_URL, REQ_LLM_API_KEY, REQ_LLM_MODEL, REQ_LLM_TEMPERATURE, REQ_LLM_MAX_TOKENS
import requests
import json
import uuid
from datetime import datetime

router = APIRouter(prefix="/api", tags=["chat"])


# ---------- Request/Response Models ----------

class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EditSuggestion(BaseModel):
    id: str
    originalContent: str
    suggestedContent: str
    position: Optional[Dict[str, int]] = None  # {start, end}
    status: str = "pending"  # 'pending' | 'applied' | 'rejected'
    description: str = ""


class ChatContext(BaseModel):
    currentDocument: str = ""
    entryId: Optional[str] = None
    entryName: Optional[str] = None
    tomeId: Optional[str] = None
    archiveId: Optional[str] = None
    selection: Optional[Dict[str, int]] = None  # {start, end}


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: ChatContext
    stream: bool = False


class ChatResponse(BaseModel):
    message: ChatMessage
    status: str  # 'success' | 'error'
    error: Optional[str] = None


# ---------- Helper Functions ----------

def build_system_prompt(context: ChatContext) -> str:
    """Build a system prompt with document context."""
    base_prompt = """You are an AI assistant integrated into StackScribe, a note-taking and documentation app.
You help users with their documents by answering questions, suggesting edits, and generating content.

Your capabilities:
- Answer questions about the current document
- Suggest improvements to writing
- Generate new content (code, text, lists, etc.)
- Help with formatting and structure

When suggesting edits to the document, format them clearly so the user can apply them.
If you're generating code, use proper markdown code blocks with language specification.
Be concise but helpful."""

    if context.currentDocument:
        doc_preview = context.currentDocument[:2000]
        if len(context.currentDocument) > 2000:
            doc_preview += "\n... [document truncated]"
        base_prompt += f"\n\n--- Current Document ---\n{doc_preview}\n--- End Document ---"

    if context.entryName:
        base_prompt += f"\n\nDocument name: {context.entryName}"

    if context.selection:
        start, end = context.selection.get("start", 0), context.selection.get("end", 0)
        if start != end and context.currentDocument:
            selected_text = context.currentDocument[start:end]
            base_prompt += f"\n\nUser has selected this text:\n<<<SELECTION>>>\n{selected_text}\n<<<END SELECTION>>>"

    return base_prompt


def parse_edit_suggestion(content: str, context: ChatContext) -> Optional[EditSuggestion]:
    """Try to parse an edit suggestion from the assistant's response."""
    # Look for common patterns like "Replace X with Y" or code blocks meant as replacements
    # This is a simple heuristic - can be enhanced later

    # Check for explicit edit markers
    if "```edit" in content.lower() or "suggested edit:" in content.lower():
        # Extract the suggested content
        import re
        edit_match = re.search(r'```edit\n(.*?)```', content, re.DOTALL)
        if edit_match:
            return EditSuggestion(
                id=str(uuid.uuid4()),
                originalContent=context.selection.get("text", "") if context.selection else "",
                suggestedContent=edit_match.group(1).strip(),
                position=context.selection,
                description="AI suggested edit"
            )

    return None


# ---------- Endpoints ----------

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Handle a chat request and return a response."""
    if not REQ_LLM_BASE_URL:
        raise HTTPException(
            status_code=400,
            detail="REQ_LLM_BASE_URL is not set. Please configure a local LLM endpoint."
        )

    try:
        # Build messages for the LLM
        system_prompt = build_system_prompt(req.context)

        llm_messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (limit to last 10 messages to avoid context overflow)
        for msg in req.messages[-10:]:
            llm_messages.append({
                "role": msg.role,
                "content": msg.content
            })

        payload = {
            "model": REQ_LLM_MODEL,
            "messages": llm_messages,
            "temperature": REQ_LLM_TEMPERATURE,
            "max_tokens": REQ_LLM_MAX_TOKENS,
            "stream": False
        }

        response = requests.post(
            f"{REQ_LLM_BASE_URL}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {REQ_LLM_API_KEY}",
            },
            data=json.dumps(payload),
            timeout=120
        )

        if response.status_code >= 400:
            raise Exception(f"LLM error: HTTP {response.status_code} - {response.text}")

        data = response.json()
        assistant_content = data["choices"][0]["message"]["content"].strip()

        # Try to parse any edit suggestions
        edit_suggestion = parse_edit_suggestion(assistant_content, req.context)

        metadata = {}
        if edit_suggestion:
            metadata["editSuggestion"] = edit_suggestion.dict()

        assistant_message = ChatMessage(
            id=str(uuid.uuid4()),
            role="assistant",
            content=assistant_content,
            timestamp=datetime.utcnow().isoformat() + "Z",
            metadata=metadata if metadata else None
        )

        return ChatResponse(
            message=assistant_message,
            status="success"
        )

    except Exception as e:
        error_msg = str(e)
        print(f"Chat error: {error_msg}")

        return ChatResponse(
            message=ChatMessage(
                id=str(uuid.uuid4()),
                role="assistant",
                content=f"I encountered an error: {error_msg}",
                timestamp=datetime.utcnow().isoformat() + "Z"
            ),
            status="error",
            error=error_msg
        )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """Handle a chat request with streaming response."""
    if not REQ_LLM_BASE_URL:
        raise HTTPException(
            status_code=400,
            detail="REQ_LLM_BASE_URL is not set. Please configure a local LLM endpoint."
        )

    async def generate():
        try:
            system_prompt = build_system_prompt(req.context)

            llm_messages = [{"role": "system", "content": system_prompt}]

            for msg in req.messages[-10:]:
                llm_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            payload = {
                "model": REQ_LLM_MODEL,
                "messages": llm_messages,
                "temperature": REQ_LLM_TEMPERATURE,
                "max_tokens": REQ_LLM_MAX_TOKENS,
                "stream": True
            }

            response = requests.post(
                f"{REQ_LLM_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {REQ_LLM_API_KEY}",
                },
                data=json.dumps(payload),
                timeout=120,
                stream=True
            )

            if response.status_code >= 400:
                error_data = {"error": f"LLM error: HTTP {response.status_code}"}
                yield f"data: {json.dumps(error_data)}\n\n"
                return

            full_content = ""
            message_id = str(uuid.uuid4())

            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith("data: "):
                        data_str = line_str[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                full_content += content
                                yield f"data: {json.dumps({'delta': content, 'done': False})}\n\n"
                        except json.JSONDecodeError:
                            continue

            # Send final message
            final_message = ChatMessage(
                id=message_id,
                role="assistant",
                content=full_content,
                timestamp=datetime.utcnow().isoformat() + "Z"
            )

            yield f"data: {json.dumps({'message': final_message.dict(), 'done': True, 'status': 'success'})}\n\n"

        except Exception as e:
            error_msg = str(e)
            print(f"Chat stream error: {error_msg}")
            yield f"data: {json.dumps({'error': error_msg, 'done': True, 'status': 'error'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
