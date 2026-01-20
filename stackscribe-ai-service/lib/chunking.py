import re
from typing import List

# ---------- Chunking helpers ----------
def strip_markdown(text: str) -> str:
    """Best-effort markdown -> plain text (very lightweight)."""
    # Remove code fences content markers but keep text
    text = re.sub(r"```[\s\S]*?```", lambda m: re.sub(r"^```.*\n|\n```$", "", m.group(0)), text)
    # Inline code/backticks
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Links: [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Emphasis markers
    text = re.sub(r"[*_]{1,3}", "", text)
    return text

def chunk_text(text: str, *, max_tokens: int = 200) -> List[str]:
    """Chunk plain text into ~max_tokens whitespace tokens."""
    cleaned = strip_markdown(text).strip()
    if not cleaned:
        return []

    # Split on blank lines first, then token-pack
    paras = [p.strip() for p in re.split(r"\n\s*\n", cleaned) if p.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    tok = 0
    for para in paras:
        words = para.split()
        if not words:
            continue
        # If a single paragraph is huge, stream it
        for w in words:
            buf.append(w)
            tok += 1
            if tok >= max_tokens:
                chunks.append(" ".join(buf))
                buf, tok = [], 0
        # Paragraph boundary: if buffer is already sizable, flush to keep boundaries somewhat intact
        if tok >= max_tokens * 0.75:
            chunks.append(" ".join(buf))
            buf, tok = [], 0
    if buf:
        chunks.append(" ".join(buf))
    return chunks