from rapidfuzz import fuzz, utils as rf_utils
import spacy, re

# ---------------- preload once ----------------
NER  = spacy.load("en_core_web_sm")
SYMBOL_RX = re.compile(r"```(\w+)?\n(.*?)```", re.S)

# ------------- heuristic functions -----------
def heading_match_bonus(query_sent, note_text, note_title):
    """+0.10 if H1/H2 appears literally in the query."""
    headings = re.findall(r"^(#+)\s+(.+)$", note_text, flags=re.M)
    clean    = {h.strip().lower() for _, h in headings}
    return 0.10 if note_title.lower() in query_sent.lower() or any(h in query_sent.lower() for h in clean) else 0.0

def ner_overlap_bonus(query_sent, note_text):
    """+0.05 per shared named entity (ORG, PERSON, etc.), max +0.15."""
    q_ents = {e.text.lower() for e in NER(query_sent).ents}
    n_ents = {e.text.lower() for e in NER(note_text[:5000]).ents}   # first ~5 k chars
    overlap = len(q_ents & n_ents)
    return min(0.05 * overlap, 0.15)

def slug_fuzzy_bonus(query_sent, note_title):
    """+0.07 if fuzzy-matched (e.g. British vs American spellings)."""
    ratio = fuzz.partial_ratio(rf_utils.default_process(query_sent), note_title)
    return 0.07 if ratio > 85 else 0.0

def code_symbol_bonus(query_sent, note_text):
    """
    +0.12 if the query mentions a symbol (function/class)
    that exists in this note’s fenced code blocks.
    """
    mentioned = re.findall(r"\b([A-Za-z_][A-Za-z0-9_]{2,})\b", query_sent)
    code      = " ".join(SYMBOL_RX.findall(note_text))   # grab code blocks
    # quick scan; you can parse with tree-sitter for accuracy
    return 0.12 if any(sym in code for sym in mentioned) else 0.0
