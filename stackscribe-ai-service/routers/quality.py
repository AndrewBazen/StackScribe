from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from lib.ambiguity_rules import rule_findings_for_chunk
from lib.llm import llm_refine_findings
from lib.json_extract import extract_json_array
from settings import REQ_LLM_BASE_URL, REQ_LLM_API_KEY, REQ_LLM_MODEL, REQ_LLM_TEMPERATURE, REQ_LLM_MAX_TOKENS
from lib.llm import RequirementOut, RequirementsRequest, DetectAmbiguityRequest, AmbiguityFindingOut
import requests
import json

router = APIRouter(prefix="/api", tags=["quality"])

# ---------- Ambiguity detection endpoints --------
@router.post("/detect_ambiguity", response_model=List[AmbiguityFindingOut])
async def detect_ambiguity(req: DetectAmbiguityRequest):
    all_findings: List[Dict[str, Any]] = []

    for ch in req.chunks:
        if not ch.text.strip():
            continue

        findings = rule_findings_for_chunk(ch)
        if not findings:
            continue

        refined = llm_refine_findings(ch.text, findings)
        all_findings.extend(refined)

    return all_findings


# -------- Requirements generation endpoints --------
@router.post("/generate_requirements", response_model=List[RequirementOut])
async def generate_requirements(req: RequirementsRequest):
    if not REQ_LLM_BASE_URL:
        raise HTTPException(status_code=400, detail="REQ_LLM_BASE_URL is not set (no local LLM config available)")
    
    results: List[RequirementOut] = []

    system = (
        "You are a rigorous requirements-engineering assistant. "
        "You are given a text chunk that represents part of a project scope. "
        "Your task is to generate concise, clear, and actionable requirements from this text. "
        "You must return ONLY a JSON array of requirement objects with the following structure: "
        "Each requirement object must have these exact keys: title, description, acceptanceCriteria, "
        "nonFunctionalRequirements, constraints, dependencies, risks, assumptions. "
        "Guidelines: Use clear, actionable language. Format functional requirements as 'The system shall [action]'. "
        "If no requirements can be derived from the text, return an empty array []. "
        "IMPORTANT: Return only valid JSON, no markdown formatting or code blocks."
    )

    for chunk in req.chunks:
        if not chunk.text.strip():
            continue

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
            r = requests.post(
                f"{REQ_LLM_BASE_URL}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {REQ_LLM_API_KEY}",
                },
                data=json.dumps(payload),
                timeout=120,
            )
            if r.status_code >= 400:
                raise Exception(f"LLM error: HTTP {r.status_code} - {r.text}")

            data = r.json()
            raw = data["choices"][0]["message"]["content"].strip()
            json_text = extract_json_array(raw)
            parsed: List[Dict[str, Any]] = json.loads(json_text)

            for item in parsed:
                results.append(RequirementOut(
                    title=item.get("title", ""),
                    description=item.get("description", ""),
                    acceptanceCriteria=item.get("acceptanceCriteria", []),
                    nonFunctionalRequirements=item.get("nonFunctionalRequirements", []),
                    constraints=item.get("constraints", []),
                    dependencies=item.get("dependencies", []),
                    risks=item.get("risks", []),
                    assumptions=item.get("assumptions", []),
                    chunkId=chunk.id,
                    start_offset=chunk.start_offset,
                    end_offset=chunk.end_offset,
                ))

        except Exception as e:
            # Non-fatal: continue with next chunk
            print(f"❌ requirements generation error for chunk {chunk.id}: {e}")
    
    return results