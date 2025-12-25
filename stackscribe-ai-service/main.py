from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient, models
import pathlib
import heuristics
import os
import re
import uuid

# ---------- Global config ----------
THRESHOLD   = float(os.getenv("THRESHOLD", "0.05"))
TOP_K       = int(os.getenv("TOP_K", "8"))
COLLECTION  = os.getenv("COLLECTION", "note_chunks")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-ai/nomic-embed-text-v1")
RERANKER_ID = os.getenv("RERANKER_ID", "BAAI/bge-reranker-base")

# Qdrant connection config
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

# ---------- Heavy objects (load once) ----------
embedder  = SentenceTransformer(EMBED_MODEL, trust_remote_code=True)
reranker  = CrossEncoder(RERANKER_ID)
client    = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# ---------- FastAPI app ----------
app = FastAPI(title="StackScribe AI Link Service")

# Add CORS middleware to allow requests from Tauri app and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "https://tauri.localhost", "tauri://localhost", "*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize collection on FastAPI startup"""
    await ensure_collection_exists()

# ---------- Initialize collection ----------
async def ensure_collection_exists():
    """Ensure the note_chunks collection exists in Qdrant"""
    try:
        # Try to get collection info
        client.get_collection(COLLECTION)
        print(f"✅ Collection '{COLLECTION}' already exists")
    except Exception as e:
        print(f"📝 Creating collection '{COLLECTION}'...")
        try:
            # Create collection with appropriate vector size
            client.create_collection(
                collection_name=COLLECTION,
                vectors_config=models.VectorParams(
                    size=embedder.get_sentence_embedding_dimension(),
                    distance=models.Distance.COSINE
                )
            )
            print(f"✅ Collection '{COLLECTION}' created successfully")
        except Exception as create_error:
            print(f"❌ Failed to create collection: {create_error}")

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

# ---------- Chunking helpers ----------
def _strip_markdown(text: str) -> str:
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

def _chunk_text(text: str, *, max_tokens: int = 200) -> List[str]:
    """Chunk plain text into ~max_tokens whitespace tokens."""
    cleaned = _strip_markdown(text).strip()
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
    try:
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
    except Exception as e:
        print(f"⚠️ Search failed: {e}")
        return []  # Return empty list if search fails

    # ----- 2. cross-encoder rerank -----
    pairs   = [(para, h.payload["text"]) for h in hits]
    scores  = reranker.predict(pairs)
    
    raw_hits   = _get_reranked_hits(para)        # returns [(hit, base_score), …]

    boosted = []
    for hit, base in raw_hits:
        note_title = hit.payload.get("entry_name", "")
        text       = hit.payload["text"]

        # 2) apply heuristics
        bonus  = 0.0
        bonus += heuristics.heading_match_bonus(para, text, note_title)
        bonus += heuristics.ner_overlap_bonus(para, text)
        bonus += heuristics.slug_fuzzy_bonus(para, note_title)
        bonus += heuristics.code_symbol_bonus(para, text)

        boosted.append((hit.payload.get("entry_id", ""), hit.payload.get("entry_name", ""), base + bonus))

    # 3) dedupe, drop self, sort
    seen = set()
    candidates = []
    for entry_id, entry_name, score in boosted:
        if not entry_id or entry_id == current_note or score <= THRESHOLD:
            continue
        if entry_id in seen:
            continue
        seen.add(entry_id)
        candidates.append((entry_id, entry_name, score))
    
    candidates.sort(key=lambda t: -t[2])       # descending by score
    return candidates[:TOP_K]

# ---------- API Endpoints ----------
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test basic Qdrant connection
        response = client.get_collections()
        
        # Check if our collection exists
        collection_exists = False
        points_count = 0
        
        collections = response.collections if hasattr(response, 'collections') else []
        for collection in collections:
            if collection.name == COLLECTION:
                collection_exists = True
                try:
                    # Try to get collection info
                    collection_info = client.get_collection(COLLECTION)
                    points_count = collection_info.points_count if hasattr(collection_info, 'points_count') else 0
                except Exception:
                    # If we can't get detailed info, that's okay
                    points_count = "unknown"
                break
        
        return {
            "status": "healthy", 
            "qdrant": "connected",
            "collection": COLLECTION,
            "collection_exists": collection_exists,
            "points_count": points_count
        }
    except Exception as e:
        # Try simpler health check
        try:
            # Just check if we can reach Qdrant at all
            import requests
            response = requests.get(f"http://{QDRANT_HOST}:{QDRANT_PORT}/")
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "qdrant": "connected (basic)",
                    "collection": COLLECTION,
                    "note": "Detailed collection info unavailable due to API version mismatch"
                }
        except Exception:
            pass
            
        return {"status": "unhealthy", "error": str(e)}

@app.post("/api/suggestions", response_model=List[LinkSuggestion])
async def get_suggestions(request: LinkSuggestionRequest):
    """Get AI-powered link suggestions"""
    try:
        suggestions = suggest_links(request.text, request.current_entry_id)
        
        result = []
        for entry_id, entry_name, score in suggestions:
            result.append(LinkSuggestion(
                entry_id=entry_id,
                entry_name=entry_name,
                score=score,
                reasoning=f"Vector similarity + cross-encoder reranking + heuristics (score: {score:.3f})"
            ))
        
        # If no suggestions found, return helpful message
        if not result:
            print(f"🔍 No suggestions found for text: '{request.text[:50]}...'")
        
        return result
    except Exception as e:
        print(f"❌ Error in get_suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@app.post("/api/index_entries")
async def index_entries(request: IndexEntriesRequest):
    """
    Index (or re-index) entries into Qdrant so suggestions have data.

    Behavior:
    - Deletes existing points for an entry_id
    - Chunks content and upserts new points
    """
    try:
        total_chunks = 0
        indexed_entries = 0

        for entry in request.entries:
            entry_id = entry.entry_id.strip()
            if not entry_id:
                continue

            # Delete existing points for this entry_id
            try:
                client.delete(
                    collection_name=COLLECTION,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(
                                    key="entry_id",
                                    match=models.MatchValue(value=entry_id),
                                )
                            ]
                        )
                    ),
                )
            except Exception as delete_err:
                # Non-fatal (e.g. older Qdrant versions / no matches)
                print(f"⚠️ Failed to delete existing points for {entry_id}: {delete_err}")

            chunks = _chunk_text(entry.content)
            if not chunks:
                continue

            points = []
            for idx, chunk in enumerate(chunks):
                points.append(
                    models.PointStruct(
                        id=str(uuid.uuid4()),
                        payload={
                            "entry_id": entry_id,
                            "entry_name": entry.entry_name,
                            "archive_id": entry.archive_id,
                            "tome_id": entry.tome_id,
                            "chunk_id": idx,
                            "text": chunk,
                        },
                        vector=_vector(chunk, is_query=False),
                    )
                )

            client.upsert(collection_name=COLLECTION, points=points)
            total_chunks += len(points)
            indexed_entries += 1

        return {
            "status": "ok",
            "indexed_entries": indexed_entries,
            "indexed_chunks": total_chunks,
            "collection": COLLECTION,
        }
    except Exception as e:
        print(f"❌ Error in index_entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index entries: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 