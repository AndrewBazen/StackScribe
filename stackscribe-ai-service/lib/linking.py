from deps import get_embedder, get_reranker, client, get_redis
from settings import TOP_K, COLLECTION, THRESHOLD
from qdrant_client import models
from typing import List, Optional, Tuple
from pydantic import BaseModel
from lib.heuristics import heading_match_bonus, ner_overlap_bonus, slug_fuzzy_bonus, code_symbol_bonus
from functools import lru_cache
import hashlib
import math
import pickle

class LinkSuggestionRequest(BaseModel):
    text: str
    current_entry_id: str

class LinkSuggestion(BaseModel):
    entry_id: str
    entry_name: str
    score: float
    reasoning: str

# -------- Indexing models --------
class EntryToIndex(BaseModel):
    entry_id: str
    entry_name: str
    content: str
    archive_id: Optional[str] = None
    tome_id: Optional[str] = None

class IndexEntriesRequest(BaseModel):
    entries: List[EntryToIndex]


# ---------- Embedding cache (~4MB for 1000 cached embeddings) ----------
EMBEDDING_CACHE_SIZE = 1000
REDIS_EMBEDDING_TTL = 3600  # 1 hour TTL for Redis cache


def _cache_key(text: str, is_query: bool) -> str:
    """Generate a cache key for embedding lookups."""
    prefix = "q:" if is_query else "p:"
    return prefix + hashlib.md5(text.encode()).hexdigest()


@lru_cache(maxsize=EMBEDDING_CACHE_SIZE)
def _get_embedding_cached(cache_key: str, text: str, is_query: bool):
    """LRU-cached embedding computation (in-memory)."""
    embedder = get_embedder()
    prefix = "query: " if is_query else "passage: "
    return embedder.encode(prefix + text, normalize_embeddings=True)


def vector(text: str, is_query: bool = False):
    """
    Get embedding with multi-tier caching:
    1. In-memory LRU cache (fastest)
    2. Redis cache (persistent across restarts)
    3. Compute fresh (slowest)
    """
    cache_key = _cache_key(text, is_query)

    # Try Redis cache first (if available)
    redis_client = get_redis()
    if redis_client:
        try:
            cached = redis_client.get(f"emb:{cache_key}")
            if cached:
                return pickle.loads(cached)
        except Exception:
            pass  # Redis unavailable, fall through

    # Compute (with in-memory LRU cache)
    embedding = _get_embedding_cached(cache_key, text, is_query)

    # Store in Redis for persistence
    if redis_client:
        try:
            redis_client.setex(f"emb:{cache_key}", REDIS_EMBEDDING_TTL, pickle.dumps(embedding))
        except Exception:
            pass  # Non-fatal

    return embedding


def batch_vector(texts: List[str], is_query: bool = False) -> List:
    """
    Batch encode multiple texts efficiently.
    Returns list of embeddings in same order as input texts.
    """
    if not texts:
        return []

    embedder = get_embedder()
    prefix = "query: " if is_query else "passage: "
    prefixed = [prefix + t for t in texts]
    return embedder.encode(prefixed, normalize_embeddings=True, show_progress_bar=False)


# ---------- Sigmoid normalization for cross-encoder scores ----------
def sigmoid(x: float) -> float:
    """Convert raw cross-encoder score to 0-1 probability."""
    return 1.0 / (1.0 + math.exp(-x))


# ------------------------------------------------------------
# Search + rerank helper
# Returns: list[tuple[ScoredPoint, float]]
#   • ScoredPoint  = hit returned by Qdrant
#   • float        = reranker (cross-encoder) score
# ------------------------------------------------------------
def get_reranked_hits(query_sent: str, *, overshoot: int = TOP_K * 2) -> List[Tuple]:
    """
    1. Encode the query sentence
    2. Fetch `overshoot` candidates from Qdrant (reduced from 3x to 2x for efficiency)
    3. Rerank the candidates with a cross-encoder
    4. Return [(hit, rerank_score), ...] sorted by rerank score descending
    """
    # --- embed query -----------------------------------------------------
    q_vec = vector(query_sent, is_query=True)

    # --- dense or hybrid search -----------------------------------------
    try:  # if your Qdrant version supports `search_multi`
        hits = client.search_multi(
            collection_name=COLLECTION,
            requests=[
                models.SearchRequest(vector=q_vec, with_payload=True, limit=overshoot),
                models.SearchRequest(text=query_sent, with_payload=True, limit=overshoot)
            ],
            rerank=models.Rerank(method="rrf")
        )
    except AttributeError:
        # Fallback to pure vector search (older Qdrant build)
        hits = client.search(
            collection_name=COLLECTION,
            query_vector=q_vec,
            limit=overshoot,
            with_payload=True
        )

    if not hits:
        return []

    # --- cross-encoder rerank -------------------------------------------
    reranker = get_reranker()
    pairs = [(query_sent, h.payload["text"]) for h in hits]
    scores = reranker.predict(pairs)

    # Sort by rerank score descending
    results = list(zip(hits, scores))
    results.sort(key=lambda x: -x[1])
    return results

# ---------- Core AI Logic ----------
def suggest_links(para: str, current_note: str) -> list[tuple[str, str, float]]:
    """
    Return up to TOP_K suggested notes for inline linking.
    Each tuple = (entry_id, entry_name, normalized_score)

    Fixed issues from original implementation:
    1. Removed duplicate reranking (was computing scores twice)
    2. Added sigmoid normalization for meaningful 0-1 scores
    3. Conditional NER - only runs for borderline scores (0.70-0.85)
    4. Proper threshold filtering after normalization
    """
    try:
        # Single reranking call (fixed duplicate reranking bug)
        raw_hits = get_reranked_hits(para, overshoot=TOP_K * 2)  # 16 candidates

        if not raw_hits:
            return []
    except Exception as e:
        print(f"⚠️ Search/rerank failed: {e}")
        return []

    boosted = []
    for hit, base_score in raw_hits:
        entry_id = hit.payload.get("entry_id", "")
        entry_name = hit.payload.get("entry_name", "")
        text = hit.payload.get("text", "")

        # Normalize raw cross-encoder score to 0-1 using sigmoid
        normalized = sigmoid(base_score)

        # Apply heuristic bonuses (now meaningful on 0-1 scale)
        bonus = 0.0
        bonus += heading_match_bonus(para, text, entry_name)
        bonus += slug_fuzzy_bonus(para, entry_name)
        bonus += code_symbol_bonus(para, text)

        # Only run expensive NER for borderline scores (0.70-0.85)
        # Clear winners (>0.85) don't need boost, losers (<0.70) won't pass anyway
        if 0.70 <= normalized <= 0.85:
            bonus += ner_overlap_bonus(para, text)

        final_score = min(normalized + bonus, 1.0)

        # Early filter: skip if below threshold
        if final_score >= THRESHOLD:
            boosted.append((entry_id, entry_name, final_score))

    # Dedupe by entry_id, keep highest score per entry
    seen = {}
    for entry_id, entry_name, score in boosted:
        if not entry_id or entry_id == current_note:
            continue
        if entry_id not in seen or score > seen[entry_id][1]:
            seen[entry_id] = (entry_name, score)

    # Sort by score descending and return top K
    candidates = [
        (entry_id, entry_name, score)
        for entry_id, (entry_name, score) in seen.items()
    ]
    candidates.sort(key=lambda t: -t[2])
    return candidates[:TOP_K]