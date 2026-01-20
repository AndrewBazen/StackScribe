import re
from typing import List, Dict, Any
from settings import VAGUE_TERMS, QUANTIFIERS, TBD_TOKENS
from lib.llm import AmbiguityChunk, severity

# ---------- Ambiguity detection helpers ----------



def find_all_phrases(text: str, phrase: str) -> List[int]:
    """Return all start indices of phrase in text (case-insensitive)."""
    starts = []
    if not phrase:
        return starts
    low_text = text.lower()
    low_phrase = phrase.lower()
    i = 0
    while True:
        j = low_text.find(low_phrase, i)
        if j == -1:
            break
        starts.append(j)
        i = j + max(1, len(low_phrase))
    return starts

# ---------- Ambiguity detection core logic ----------
def rule_findings_for_chunk(chunk: AmbiguityChunk) -> List[Dict[str, Any]]:
    text = chunk.text
    findings: List[Dict[str, Any]] = []

    # TBD/TODO
    for token in TBD_TOKENS:
        for start in find_all_phrases(text, token):
            phrase = text[start:start+len(token)]
            findings.append({
                "phrase": phrase,
                "kind": "TBD",
                "suggestedRewrite": "",
                "clarifyingQuestion": "What is the missing detail that should replace this placeholder?",
                "chunkId": chunk.id,
                "start_offset": chunk.start_offset + start,
                "end_offset": chunk.start_offset + start + len(phrase),
                "severity": severity("TBD"),
            })

    # Vague terms
    for term in VAGUE_TERMS:
        for start in find_all_phrases(text, term):
            phrase = text[start:start+len(term)]
            findings.append({
                "phrase": phrase,
                "kind": "VAGUENESS",
                "suggestedRewrite": "",
                "clarifyingQuestion": f'What does "{phrase}" mean in measurable/testable terms?',
                "chunkId": chunk.id,
                "start_offset": chunk.start_offset + start,
                "end_offset": chunk.start_offset + start + len(phrase),
                "severity": severity("VAGUENESS"),
            })

    # Quantifiers (only when not followed by a number like "some 10")
    for q in QUANTIFIERS:
        for start in find_all_phrases(text, q):
            after = text[start+len(q):start+len(q)+6]
            if re.search(r"\d", after):
                continue
            phrase = text[start:start+len(q)]
            findings.append({
                "phrase": phrase,
                "kind": "QUANTIFIER",
                "suggestedRewrite": "",
                "clarifyingQuestion": f'Can you replace "{phrase}" with a specific quantity/threshold?',
                "chunkId": chunk.id,
                "start_offset": chunk.start_offset + start,
                "end_offset": chunk.start_offset + start + len(phrase),
                "severity": severity("QUANTIFIER"),
            })

    # Simple anaphora: sentence begins with It/This/That/They
    for m in re.finditer(r"(^|\n)\s*(It|This|That|They)\b", text):
        phrase = m.group(2)
        start = m.start(2)
        findings.append({
            "phrase": phrase,
            "kind": "ANAPHORA",
            "suggestedRewrite": "",
            "clarifyingQuestion": f'What does "{phrase}" refer to specifically?',
            "chunkId": chunk.id,
            "start_offset": chunk.start_offset + start,
            "end_offset": chunk.start_offset + start + len(phrase),
            "severity": severity("ANAPHORA"),
        })

    # Dedupe identical spans
    seen = set()
    deduped = []
    for f in findings:
        key = (f["chunkId"], f["start_offset"], f["end_offset"], f["kind"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(f)
    return deduped