from typing import List, Dict, Any, Optional
from settings import REQ_LLM_BASE_URL, REQ_LLM_API_KEY, REQ_LLM_MODEL
from deps import get_http_client
import json
import asyncio
from pydantic import BaseModel

# -------- Requirements generation models --------
class RequirementChunk(BaseModel):
    id: str
    text: str
    start_offset: int
    end_offset: int

class RequirementsRequest(BaseModel):
    chunks: List[RequirementChunk]
    prompt: Optional[str] = None

class RequirementOut(BaseModel):
    title: str
    description: str
    acceptanceCriteria: List[str]
    nonFunctionalRequirements: List[str]
    constraints: List[str]
    dependencies: List[str]
    risks: List[str]
    assumptions: List[str]
    chunkId: str
    start_offset: int
    end_offset: int

# -------- Ambiguity detection models --------
class AmbiguityChunk(BaseModel):
    id: str
    text: str
    start_offset: int
    end_offset: int

class DetectAmbiguityRequest(BaseModel):
    chunks: List[AmbiguityChunk]

class AmbiguityFindingOut(BaseModel):
    phrase: str
    kind: str
    suggestedRewrite: str
    clarifyingQuestion: str
    chunkId: str
    start_offset: int
    end_offset: int
    severity: int

def severity(kind: str) -> int:
    if kind in ("VAGUENESS", "QUANTIFIER"):
        return 2
    if kind in ("MISSING_REF", "ANAPHORA"):
        return 3
    return 1

async def llm_refine_findings_async(chunk_text: str, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Use the LLM to fill suggestedRewrite + clarifyingQuestion (and optionally adjust kind)
    for the findings detected by rules. Async version with connection pooling.
    """
    if not REQ_LLM_BASE_URL:
        return findings  # no local LLM configured

    # Keep prompt compact: only send the chunk and the list of phrases/kinds
    compact = [{"phrase": f["phrase"], "kind": f["kind"]} for f in findings]

    system = (
        "You are a requirements-quality assistant. "
        "Given a text chunk and a list of flagged ambiguous phrases with kinds, "
        "return ONLY a JSON array with the same number of items, in the same order. "
        "Each item must include keys: phrase, kind, suggestedRewrite, clarifyingQuestion. "
        "You may keep kind as-is or change it to one of: VAGUENESS|MISSING_REF|QUANTIFIER|ANAPHORA|TBD. "
        "suggestedRewrite should be a concrete rewrite of the sentence/phrase. "
        "clarifyingQuestion should be a single concise question to remove ambiguity. "
        "Return only valid JSON, no markdown."
    )

    user = json.dumps({
        "chunk": chunk_text,
        "flags": compact,
    })

    payload = {
        "model": REQ_LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "max_tokens": 800,
    }

    try:
        http_client = get_http_client()
        r = await http_client.post(
            f"{REQ_LLM_BASE_URL}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {REQ_LLM_API_KEY}",
            },
            json=payload,
        )
        if r.status_code >= 400:
            return findings

        data = r.json()
        raw = data["choices"][0]["message"]["content"].strip()

        # best-effort extract JSON array
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1 or end <= start:
            return findings

        refined = json.loads(raw[start:end+1])
        if not isinstance(refined, list) or len(refined) != len(findings):
            return findings

        # Merge refined fields back into the original findings (keep offsets from rules)
        merged = []
        for base, rf in zip(findings, refined):
            merged.append({
                **base,
                "phrase": rf.get("phrase", base["phrase"]),
                "kind": rf.get("kind", base["kind"]),
                "suggestedRewrite": rf.get("suggestedRewrite", base.get("suggestedRewrite", "")),
                "clarifyingQuestion": rf.get("clarifyingQuestion", base.get("clarifyingQuestion", "")),
                "severity": severity(rf.get("kind", base["kind"])),
            })
        return merged
    except Exception:
        return findings


def llm_refine_findings(chunk_text: str, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sync wrapper for backward compatibility."""
    try:
        loop = asyncio.get_running_loop()
        # If we're already in an async context, we need to use a different approach
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, llm_refine_findings_async(chunk_text, findings))
            return future.result()
    except RuntimeError:
        # No running loop, we can just run it
        return asyncio.run(llm_refine_findings_async(chunk_text, findings))