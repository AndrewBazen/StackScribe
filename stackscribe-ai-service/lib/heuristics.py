from rapidfuzz import fuzz, utils as rf_utils
from settings import NER, SYMBOL_RX, STOPWORDS
import re


# ------------- heuristic functions (rescaled for 0-1 sigmoid scores) -----------

def heading_match_bonus(query_sent: str, note_text: str, note_title: str) -> float:
    """
    +0.08 if H1/H2 heading or note title appears literally in the query.
    Rescaled from 0.10 to be meaningful on 0-1 normalized scores.
    """
    headings = re.findall(r"^(#+)\s+(.+)$", note_text, flags=re.M)
    clean = {h.strip().lower() for _, h in headings}
    query_lower = query_sent.lower()
    if note_title.lower() in query_lower:
        return 0.08
    if any(h in query_lower for h in clean):
        return 0.08
    return 0.0


def ner_overlap_bonus(query_sent: str, note_text: str) -> float:
    """
    +0.03 per shared named entity (ORG, PERSON, etc.), max +0.09.
    Rescaled from 0.05/0.15 to be meaningful on 0-1 normalized scores.

    NOTE: This function is expensive (runs spaCy NER). Only call for borderline
    scores (0.70-0.85) where the bonus might change the outcome.
    """
    q_ents = {e.text.lower() for e in NER(query_sent).ents}
    n_ents = {e.text.lower() for e in NER(note_text[:5000]).ents}  # first ~5k chars
    overlap = len(q_ents & n_ents)
    return min(0.03 * overlap, 0.09)


def slug_fuzzy_bonus(query_sent: str, note_title: str) -> float:
    """
    +0.05 if fuzzy-matched (e.g. British vs American spellings).
    Rescaled from 0.07 to be meaningful on 0-1 normalized scores.
    """
    ratio = fuzz.partial_ratio(rf_utils.default_process(query_sent), note_title)
    return 0.05 if ratio > 85 else 0.0


def code_symbol_bonus(query_sent: str, note_text: str) -> float:
    """
    +0.06 if the query mentions a meaningful symbol (function/class name)
    that exists in this note's fenced code blocks.

    Rescaled from 0.12 and now filters stopwords to avoid matching
    common words like "the", "and", "for" (3+ chars that would match).
    Requires 4+ character symbols to reduce false positives.
    """
    # Find potential symbols: alphanumeric identifiers 4+ chars, not stopwords
    mentioned = [
        sym for sym in re.findall(r"\b([A-Za-z_][A-Za-z0-9_]{3,})\b", query_sent)
        if sym.lower() not in STOPWORDS
    ]
    if not mentioned:
        return 0.0

    # Extract code from fenced code blocks
    code_blocks = SYMBOL_RX.findall(note_text)
    if not code_blocks:
        return 0.0

    code = " ".join(block[1] if isinstance(block, tuple) else block for block in code_blocks)
    return 0.06 if any(sym in code for sym in mentioned) else 0.0
