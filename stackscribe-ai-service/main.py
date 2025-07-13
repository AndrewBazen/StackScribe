from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Tuple
from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient, models
import pathlib
import heuristics

# ---------- Global config ----------
THRESHOLD   = 0.05
TOP_K       = 8
COLLECTION  = "note_chunks"
EMBED_MODEL = "nomic-ai/nomic-embed-text-v1"
RERANKER_ID = "BAAI/bge-reranker-base"     # Cross-encoder

# ---------- Heavy objects (load once) ----------
embedder  = SentenceTransformer(EMBED_MODEL, trust_remote_code=True)
reranker  = CrossEncoder(RERANKER_ID)
client    = QdrantClient(host="localhost", port=6333)

# ---------- FastAPI app ----------
app = FastAPI(title="StackScribe AI Link Service")

class LinkSuggestionRequest(BaseModel):
    text: str
    current_note: str

class LinkSuggestion(BaseModel):
    note: str
    score: float
    reasoning: str

# ---------- Helper ----------
def _vector(text: str, is_query: bool = False):
    prefix = "query: " if is_query else "passage: "
    return embedder.encode(prefix + text, normalize_embeddings=True)

# ------------------------------------------------------------
# Search + rerank helper
# Returns: list[tuple[ScoredPoint, float]]
#   • ScoredPoint  = hit returned by Qdrant
#   • float        = reranker (cross-encoder) score
# ------------------------------------------------------------
def _get_reranked_hits(query_sent: str, *, overshoot: int = TOP_K * 3):
    """
    1. Encode the query sentence
    2. Fetch `overshoot` candidates from Qdrant
       – plain vector search OR hybrid if `search_multi` is available
    3. Rerank the candidates with a cross-encoder
    4. Return [(hit, rerank_score), …] in **original hit order**
       (you decide later how to sort or filter)
    """
    # --- embed query -----------------------------------------------------
    q_vec = embedder.encode(f"query: {query_sent}", normalize_embeddings=True)

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
    pairs   = [(query_sent, h.payload["text"]) for h in hits]
    scores  = reranker.predict(pairs)

    return list(zip(hits, scores))

# ---------- Core AI Logic ----------
def suggest_links(para: str, current_note: str) -> list[tuple[str, float]]:
    """
    Return up to TOP_K suggested notes for inline linking.
    Each tuple = (note_filename, reranked_score)
    """
    q_vec = _vector(para, is_query=True)

    # ----- 1. vector search (fast) -----
    hits = client.search(
        collection_name=COLLECTION,
        query_vector=q_vec,
        limit=TOP_K * 5,           # over-fetch; we'll rerank & trim
        with_payload=True,
    )

    if not hits:
        return []

    # ----- 2. cross-encoder rerank -----
    pairs   = [(para, h.payload["text"]) for h in hits]
    scores  = reranker.predict(pairs)
    
    raw_hits   = _get_reranked_hits(para)        # returns [(hit, base_score), …]

    boosted = []
    for hit, base in raw_hits:
        note_title = pathlib.Path(hit.payload["note"]).stem
        text       = hit.payload["text"]

        # 2) apply heuristics
        bonus  = 0.0
        bonus += heuristics.heading_match_bonus(para, text, note_title)
        bonus += heuristics.ner_overlap_bonus(para, text)
        bonus += heuristics.slug_fuzzy_bonus(para, note_title)
        bonus += heuristics.code_symbol_bonus(para, text)

        boosted.append((hit.payload["note"], base + bonus))

    # 3) dedupe, drop self, sort
    candidates = [
        (note, score) for note, score in boosted
        if note != current_note and score > THRESHOLD
    ]
    
    candidates.sort(key=lambda t: -t[1])       # descending by score
    return candidates[:TOP_K]

# ---------- API Endpoints ----------
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Qdrant connection
        client.get_collection(COLLECTION)
        return {"status": "healthy", "qdrant": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.post("/api/suggestions", response_model=List[LinkSuggestion])
async def get_suggestions(request: LinkSuggestionRequest):
    """Get AI-powered link suggestions"""
    try:
        suggestions = suggest_links(request.text, request.current_note)
        
        result = []
        for note, score in suggestions:
            result.append(LinkSuggestion(
                note=note,
                score=score,
                reasoning=f"Vector similarity + cross-encoder reranking + heuristics (score: {score:.3f})"
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 