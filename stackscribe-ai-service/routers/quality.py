from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from lib.ambiguity_rules import rule_findings_for_chunk
from lib.llm import llm_refine_findings_async
from lib.json_extract import extract_json_array, extract_json_object
from settings import REQ_LLM_BASE_URL, REQ_LLM_API_KEY, REQ_LLM_MODEL, REQ_LLM_TEMPERATURE, REQ_LLM_MAX_TOKENS
from lib.llm import RequirementOut, RequirementsRequest, DetectAmbiguityRequest, AmbiguityFindingOut
from deps import get_http_client
import asyncio
import json

# Semaphore to limit concurrent LLM calls (prevent overload)
LLM_SEMAPHORE = asyncio.Semaphore(4)

router = APIRouter(prefix="/api", tags=["quality"])

# ---------- Ambiguity detection endpoints --------
@router.post("/detect_ambiguity", response_model=List[AmbiguityFindingOut])
async def detect_ambiguity(req: DetectAmbiguityRequest):
    """Detect ambiguities with parallel LLM refinement."""

    async def process_chunk(ch):
        if not ch.text.strip():
            return []
        findings = rule_findings_for_chunk(ch)
        if not findings:
            return []
        async with LLM_SEMAPHORE:
            return await llm_refine_findings_async(ch.text, findings)

    # Process all chunks concurrently (semaphore limits parallelism)
    results = await asyncio.gather(*[process_chunk(ch) for ch in req.chunks])

    all_findings: List[Dict[str, Any]] = []
    for refined in results:
        all_findings.extend(refined)

    return all_findings


# -------- Requirements generation endpoints --------
@router.post("/generate_requirements", response_model=List[RequirementOut])
async def generate_requirements(req: RequirementsRequest):
    """Generate requirements with parallel LLM calls using connection pooling."""
    if not REQ_LLM_BASE_URL:
        raise HTTPException(status_code=400, detail="REQ_LLM_BASE_URL is not set (no local LLM config available)")

    system = (
        "You are a rigorous requirements-engineering assistant. "
        "You are given a text chunk that represents part of a project scope. "
        "If a user intent is provided, treat it as the project scope and infer a reasonable starter set of requirements, "
        "even if the chunk is brief. "
        "Your task is to generate concise, clear, and actionable requirements from this text. "
        "You must return ONLY a JSON array of requirement objects with the following structure: "
        "Each requirement object must have these exact keys: title, description, acceptanceCriteria, "
        "nonFunctionalRequirements, constraints, dependencies, risks, assumptions. "
        "Guidelines: Use clear, actionable language. Format functional requirements as 'The system shall [action]'. "
        "Only return an empty array [] when there is truly no actionable scope. "
        "IMPORTANT: Return only valid JSON, no markdown formatting or code blocks."
    )

    def coerce_list(value: Any, label: str) -> List[str]:
        """Convert various types to a list of strings for Pydantic validation."""
        if value is None:
            return []
        if isinstance(value, list):
            return [str(v) for v in value]
        if isinstance(value, dict):
            result = [f"{k}: {v}" for k, v in value.items()]
            return result
        if isinstance(value, str):
            return [value]
        raise Exception(f"LLM returned unexpected type for {label}: {type(value).__name__} = {value}")

    async def process_chunk(chunk):
        """Process a single chunk with the LLM."""
        if not chunk.text.strip():
            return [], None

        user = f"<<<CHUNK>>>\n{chunk.text}\n<<<END>>>"
        if req.prompt:
            user = f"User intent: {req.prompt}\n\n" + user

        payload = {
            "model": REQ_LLM_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ],
            "temperature": REQ_LLM_TEMPERATURE,
            "max_tokens": REQ_LLM_MAX_TOKENS,
        }

        try:
            async with LLM_SEMAPHORE:
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
                    raise Exception(f"LLM error: HTTP {r.status_code} - {r.text}")

                data = r.json()
                raw = data["choices"][0]["message"]["content"].strip()
                json_text = extract_json_array(raw)

                parsed: List[Dict[str, Any]] = []
                if json_text != "[]":
                    parsed = json.loads(json_text)
                else:
                    obj_text = extract_json_object(raw)
                    if obj_text:
                        obj = json.loads(obj_text)
                        if isinstance(obj, dict) and isinstance(obj.get("requirements"), list):
                            parsed = obj["requirements"]
                        elif isinstance(obj, dict):
                            parsed = [obj]

                if not isinstance(parsed, list):
                    raise Exception(f"LLM returned non-array JSON: {type(parsed).__name__}")

                if parsed == [] and raw and raw.strip() != "[]":
                    raise Exception(f"LLM returned no JSON array. Raw: {raw[:300]}")

                chunk_results = []
                for item in parsed:
                    if not isinstance(item, dict):
                        raise Exception("LLM returned non-object in requirements array")
                    chunk_results.append(RequirementOut(
                        title=item.get("title", ""),
                        description=item.get("description", ""),
                        acceptanceCriteria=coerce_list(item.get("acceptanceCriteria", []), "acceptanceCriteria"),
                        nonFunctionalRequirements=coerce_list(item.get("nonFunctionalRequirements", []), "nonFunctionalRequirements"),
                        constraints=coerce_list(item.get("constraints", []), "constraints"),
                        dependencies=coerce_list(item.get("dependencies", []), "dependencies"),
                        risks=coerce_list(item.get("risks", []), "risks"),
                        assumptions=coerce_list(item.get("assumptions", []), "assumptions"),
                        chunkId=chunk.id,
                        start_offset=chunk.start_offset,
                        end_offset=chunk.end_offset,
                    ))
                return chunk_results, None

        except Exception as e:
            error_msg = f"requirements generation error for chunk {chunk.id}: {e}"
            print(f"⚠️ {error_msg}")
            return [], error_msg

    # Process all chunks concurrently
    results_and_errors = await asyncio.gather(*[process_chunk(chunk) for chunk in req.chunks])

    results: List[RequirementOut] = []
    errors: List[str] = []
    for chunk_results, error in results_and_errors:
        results.extend(chunk_results)
        if error:
            errors.append(error)

    if not results and errors:
        detail = "; ".join(errors[:3])
        if len(errors) > 3:
            detail = f"{detail}; ... ({len(errors)} errors total)"
        raise HTTPException(status_code=502, detail=detail)

    return results
