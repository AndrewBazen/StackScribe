import re
from typing import Set
from difflib import SequenceMatcher
import spacy

# Load spaCy model for NER (install with: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: spaCy model not found. NER overlap bonus will be disabled.")
    nlp = None

def heading_match_bonus(query: str, text: str, note_title: str) -> float:
    """
    Bonus for headings that match the query.
    Checks if the text looks like a heading (starts with #) and matches query terms.
    """
    if not text.strip().startswith('#'):
        return 0.0
    
    # Extract heading text (remove # symbols)
    heading_text = re.sub(r'^#+\s*', '', text.strip())
    
    # Check for word overlap between query and heading
    query_words = set(query.lower().split())
    heading_words = set(heading_text.lower().split())
    
    overlap = len(query_words & heading_words)
    if overlap > 0:
        return 0.2 * min(overlap / len(query_words), 1.0)
    
    return 0.0

def ner_overlap_bonus(query: str, text: str) -> float:
    """
    Bonus for named entity overlap between query and text.
    Uses spaCy NER to identify entities and calculate overlap.
    """
    if nlp is None:
        return 0.0
    
    try:
        query_doc = nlp(query)
        text_doc = nlp(text)
        
        # Extract entities
        query_entities = {ent.text.lower() for ent in query_doc.ents}
        text_entities = {ent.text.lower() for ent in text_doc.ents}
        
        if not query_entities:
            return 0.0
        
        overlap = len(query_entities & text_entities)
        return 0.15 * min(overlap / len(query_entities), 1.0)
    
    except Exception:
        return 0.0

def slug_fuzzy_bonus(query: str, note_title: str) -> float:
    """
    Bonus for fuzzy matching between query and note title.
    Uses sequence matching to find similar titles.
    """
    # Convert to lowercase and clean
    query_clean = re.sub(r'[^a-zA-Z0-9\s]', '', query.lower())
    title_clean = re.sub(r'[^a-zA-Z0-9\s]', '', note_title.lower())
    
    # Calculate similarity
    similarity = SequenceMatcher(None, query_clean, title_clean).ratio()
    
    # Apply bonus if similarity is high
    if similarity > 0.6:
        return 0.25 * similarity
    
    return 0.0

def code_symbol_bonus(query: str, text: str) -> float:
    """
    Bonus for code symbols and technical terms.
    Looks for programming-related patterns in both query and text.
    """
    # Common code patterns
    code_patterns = [
        r'\b[A-Z][a-zA-Z0-9]*\b',  # CamelCase
        r'\b[a-z_][a-zA-Z0-9_]*\(\)',  # function calls
        r'\b[A-Z_][A-Z0-9_]*\b',  # CONSTANTS
        r'`[^`]+`',  # backticks
        r'\b(def|class|import|from|return|if|else|for|while|try|except)\b',  # keywords
        r'\.(js|py|rs|ts|cpp|java|go|php)\b',  # file extensions
    ]
    
    query_matches = set()
    text_matches = set()
    
    for pattern in code_patterns:
        query_matches.update(re.findall(pattern, query))
        text_matches.update(re.findall(pattern, text))
    
    if not query_matches:
        return 0.0
    
    overlap = len(query_matches & text_matches)
    return 0.1 * min(overlap / len(query_matches), 1.0)

def calculate_total_bonus(query: str, text: str, note_title: str) -> float:
    """
    Calculate the total heuristic bonus for a given query-text pair.
    """
    total = 0.0
    total += heading_match_bonus(query, text, note_title)
    total += ner_overlap_bonus(query, text)
    total += slug_fuzzy_bonus(query, note_title)
    total += code_symbol_bonus(query, text)
    
    return total 